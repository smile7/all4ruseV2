import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function savePushSubscription(
  client: Client,
  userId: string,
  sub: PushSubscriptionInput,
): Promise<void> {
  const { error } = await client.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) throw error;
}

async function deletePushSubscription(
  client: Client,
  userId: string,
  endpoint: string,
): Promise<void> {
  const { error } = await client
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) throw error;
}

async function hasPushSubscription(
  client: Client,
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const { data } = await client
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle();
  return data !== null;
}

export type ReminderSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  eventTitle: string;
  eventSlug: string;
  eventDate: string;
};

/**
 * Fetches all (push_subscription, event) pairs where:
 * - The event starts today (in Bulgaria time)
 * - The user's profile reminder_time matches the given hour (e.g. "09")
 * - The event is active and not cancelled
 *
 * Intended for use with an admin client from the cron endpoint only.
 */
async function getSubscriptionsForTodayReminders(
  client: Client,
  currentHour: string, // zero-padded "HH", e.g. "09"
): Promise<ReminderSubscription[]> {
  const todayBg = getTodayInBulgaria();
  const reminderTime = `${currentHour}:00`;

  // Step 1: find events starting today.
  const { data: todayEvents, error: eventsError } = await client
    .from("events")
    .select("id, title, slug, startDate")
    .eq("startDate", todayBg)
    .eq("isEventActive", true)
    .or("isEventCancelled.is.null,isEventCancelled.eq.false");

  if (eventsError) throw eventsError;
  if (!todayEvents || todayEvents.length === 0) return [];

  const eventIds = todayEvents.map((e) => e.id);

  // Step 2: find users who saved any of those events.
  const { data: savedRows, error: savedError } = await client
    .from("saved_events")
    .select("user_id, event_id")
    .in("event_id", eventIds);

  if (savedError) throw savedError;
  if (!savedRows || savedRows.length === 0) return [];

  const userIds = [...new Set(savedRows.map((r) => r.user_id))];

  // Step 3: push subscriptions + profile reminder times (separate queries —
  // push_subscriptions.user_id FK points to auth.users, not profiles).
  const [{ data: subs, error: subsError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      client
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth")
        .in("user_id", userIds),
      client
        .from("profiles")
        .select("id, reminder_time")
        .in("id", userIds)
        .eq("reminder_time", reminderTime),
    ]);

  if (subsError) throw subsError;
  if (profilesError) throw profilesError;
  if (!subs || subs.length === 0) return [];
  if (!profiles || profiles.length === 0) return [];

  const eligibleUserIds = new Set(profiles.map((p) => p.id));
  const eligibleSubs = subs.filter((sub) => eligibleUserIds.has(sub.user_id));
  if (eligibleSubs.length === 0) return [];

  // Step 4: build result — one notification per (subscription, event) pair.
  const eventMap = new Map(todayEvents.map((e) => [e.id, e]));

  const results: ReminderSubscription[] = [];
  for (const sub of eligibleSubs) {
    const userSaves = savedRows.filter((r) => r.user_id === sub.user_id);
    for (const save of userSaves) {
      const event = eventMap.get(save.event_id);
      if (!event) continue;
      results.push({
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        eventTitle: event.title ?? "",
        eventSlug: event.slug ?? String(event.id),
        eventDate: event.startDate ?? todayBg,
      });
    }
  }

  return results;
}

const BG_TIMEZONE = "Europe/Sofia";

function getBulgariaDateParts(): { date: string; hour: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BG_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  if (hour === "24") hour = "00";

  return {
    date: `${year}-${month}-${day}`,
    hour: hour.padStart(2, "0"),
  };
}

/** Returns today's date as YYYY-MM-DD in Bulgaria (Europe/Sofia). */
export function getTodayInBulgaria(): string {
  return getBulgariaDateParts().date;
}

/** Current hour in Bulgaria as zero-padded "HH". */
export function getCurrentHourInBulgaria(): string {
  return getBulgariaDateParts().hour;
}

export type ReminderDebugCounts = {
  todayBg: string;
  reminderTime: string;
  eventsToday: number;
  savedMatches: number;
  pushSubscriptions: number;
  profilesAtReminderTime: number;
  eligibleSubscriptions: number;
};

/** Same filters as getSubscriptionsForTodayReminders, but returns counts for debugging. */
async function getReminderDebugCounts(
  client: Client,
  currentHour: string,
): Promise<ReminderDebugCounts> {
  const todayBg = getTodayInBulgaria();
  const reminderTime = `${currentHour}:00`;

  const { data: todayEvents } = await client
    .from("events")
    .select("id")
    .eq("startDate", todayBg)
    .eq("isEventActive", true)
    .or("isEventCancelled.is.null,isEventCancelled.eq.false");

  const eventIds = (todayEvents ?? []).map((e) => e.id);

  const { data: savedRows } =
    eventIds.length > 0
      ? await client
          .from("saved_events")
          .select("user_id, event_id")
          .in("event_id", eventIds)
      : { data: [] as { user_id: string; event_id: number }[] };

  const userIds = [...new Set((savedRows ?? []).map((r) => r.user_id))];

  let subs: { user_id: string }[] = [];
  let profiles: { id: string }[] = [];

  if (userIds.length > 0) {
    const [subsResult, profilesResult] = await Promise.all([
      client.from("push_subscriptions").select("user_id").in("user_id", userIds),
      client
        .from("profiles")
        .select("id")
        .in("id", userIds)
        .eq("reminder_time", reminderTime),
    ]);
    subs = subsResult.data ?? [];
    profiles = profilesResult.data ?? [];
  }

  const eligibleUserIds = new Set(profiles.map((p) => p.id));
  const eligibleSubscriptions = subs.filter((sub) =>
    eligibleUserIds.has(sub.user_id),
  ).length;

  return {
    todayBg,
    reminderTime,
    eventsToday: eventIds.length,
    savedMatches: savedRows?.length ?? 0,
    pushSubscriptions: subs.length,
    profilesAtReminderTime: profiles.length,
    eligibleSubscriptions,
  };
}

export const pushSubscriptionsApi = {
  savePushSubscription,
  deletePushSubscription,
  hasPushSubscription,
  getSubscriptionsForTodayReminders,
  getReminderDebugCounts,
};
