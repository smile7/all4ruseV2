import type { SupabaseClient } from "@supabase/supabase-js";

import type { PushEnableFailureStage } from "~/lib/push-client";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function syncPushNotificationsEnabled(
  client: Client,
  userId: string,
): Promise<boolean> {
  const { count, error: countError } = await client
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) throw countError;

  const enabled = (count ?? 0) > 0;
  const { error: profileError } = await client
    .from("profiles")
    .update({ push_notifications_enabled: enabled })
    .eq("id", userId);

  if (profileError) throw profileError;

  return enabled;
}

async function syncPushNotificationsEnabledForUsers(
  client: Client,
  userIds: string[],
): Promise<void> {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return;

  const { data: subs, error: subsError } = await client
    .from("push_subscriptions")
    .select("user_id")
    .in("user_id", uniqueUserIds);

  if (subsError) throw subsError;

  const enabledUserIdSet = new Set((subs ?? []).map((sub) => sub.user_id));
  const enabledUserIds = [...enabledUserIdSet];
  const disabledUserIds = uniqueUserIds.filter(
    (userId) => !enabledUserIdSet.has(userId),
  );

  if (enabledUserIds.length > 0) {
    const { error } = await client
      .from("profiles")
      .update({ push_notifications_enabled: true })
      .in("id", enabledUserIds);

    if (error) throw error;
  }

  if (disabledUserIds.length > 0) {
    const { error } = await client
      .from("profiles")
      .update({ push_notifications_enabled: false })
      .in("id", disabledUserIds);

    if (error) throw error;
  }
}

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

  await syncPushNotificationsEnabled(client, userId);
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

  await syncPushNotificationsEnabled(client, userId);
}

async function deletePushSubscriptionsByEndpoints(
  client: Client,
  endpoints: string[],
): Promise<void> {
  const uniqueEndpoints = [...new Set(endpoints)];
  if (uniqueEndpoints.length === 0) return;

  const { data: existingSubs, error: existingSubsError } = await client
    .from("push_subscriptions")
    .select("user_id")
    .in("endpoint", uniqueEndpoints);

  if (existingSubsError) throw existingSubsError;

  const { error } = await client
    .from("push_subscriptions")
    .delete()
    .in("endpoint", uniqueEndpoints);

  if (error) throw error;

  await syncPushNotificationsEnabledForUsers(
    client,
    (existingSubs ?? []).map((sub) => sub.user_id),
  );
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

type PushEnableFailureInput = {
  stage: PushEnableFailureStage;
  message: string | null;
  permission: string | null;
  userAgent: string | null;
};

/** Requires an admin client — the table is readable only via the service role. */
async function logPushEnableFailure(
  client: Client,
  userId: string | null,
  input: PushEnableFailureInput,
): Promise<void> {
  const { error } = await client.from("push_enable_failures").insert({
    user_id: userId,
    stage: input.stage,
    message: input.message,
    permission: input.permission,
    user_agent: input.userAgent,
  });
  if (error) throw error;
}

/** Whether the event a reminder refers to happens today or tomorrow. */
export type ReminderKind = "today" | "tomorrow";

export type ReminderSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  eventTitle: string;
  eventSlug: string;
  eventDate: string;
  kind: ReminderKind;
};

export type ReminderDebugCounts = {
  todayBg: string;
  tomorrowBg: string;
  reminderTime: string;
  eventsToday: number;
  eventsTomorrow: number;
  savedMatches: number;
  pushSubscriptions: number;
  profilesAtReminderTimeAndEnabled: number;
  eligibleSubscriptions: number;
};

export type DueReminders = {
  subscriptions: ReminderSubscription[];
  debug: ReminderDebugCounts;
};

/**
 * Fetches all (push_subscription, event) pairs where:
 * - The event starts today or tomorrow (in Bulgaria time)
 * - The user's profile reminder_time matches the given hour (e.g. "09")
 * - The user's profile has push_notifications_enabled = true
 * - The event is active and not cancelled
 *
 * Debug counts come from the same queries so the cron endpoint can report what
 * it saw without running the whole thing twice.
 *
 * Intended for use with an admin client from the cron endpoint only.
 */
async function getDueReminders(
  client: Client,
  currentHour: string, // zero-padded "HH", e.g. "09"
): Promise<DueReminders> {
  const todayBg = getTodayInBulgaria();
  const tomorrowBg = getTomorrowInBulgaria();
  const reminderTime = `${currentHour}:00`;

  const debug: ReminderDebugCounts = {
    todayBg,
    tomorrowBg,
    reminderTime,
    eventsToday: 0,
    eventsTomorrow: 0,
    savedMatches: 0,
    pushSubscriptions: 0,
    profilesAtReminderTimeAndEnabled: 0,
    eligibleSubscriptions: 0,
  };

  // Step 1: find events starting today or tomorrow.
  const { data: dueEvents, error: eventsError } = await client
    .from("events")
    .select("id, title, slug, startDate")
    .in("startDate", [todayBg, tomorrowBg])
    .eq("isEventActive", true)
    .or("isEventCancelled.is.null,isEventCancelled.eq.false");

  if (eventsError) throw eventsError;

  const events = dueEvents ?? [];
  debug.eventsToday = events.filter((e) => e.startDate === todayBg).length;
  debug.eventsTomorrow = events.filter(
    (e) => e.startDate === tomorrowBg,
  ).length;
  if (events.length === 0) return { subscriptions: [], debug };

  // Step 2: find users who saved any of those events.
  const { data: savedRows, error: savedError } = await client
    .from("saved_events")
    .select("user_id, event_id")
    .in(
      "event_id",
      events.map((e) => e.id),
    );

  if (savedError) throw savedError;

  const saves = savedRows ?? [];
  debug.savedMatches = saves.length;
  if (saves.length === 0) return { subscriptions: [], debug };

  const userIds = [...new Set(saves.map((r) => r.user_id))];

  // Step 3: push subscriptions + profile reminder times (separate queries —
  // push_subscriptions.user_id FK points to auth.users, not profiles).
  const [
    { data: subs, error: subsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    client
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", userIds),
    client
      .from("profiles")
      .select("id")
      .in("id", userIds)
      .eq("push_notifications_enabled", true)
      .eq("reminder_time", reminderTime),
  ]);

  if (subsError) throw subsError;
  if (profilesError) throw profilesError;

  const userSubs = subs ?? [];
  const dueProfiles = profiles ?? [];
  debug.pushSubscriptions = userSubs.length;
  debug.profilesAtReminderTimeAndEnabled = dueProfiles.length;

  const dueUserIds = new Set(dueProfiles.map((p) => p.id));
  const eligibleSubs = userSubs.filter((sub) => dueUserIds.has(sub.user_id));
  debug.eligibleSubscriptions = eligibleSubs.length;
  if (eligibleSubs.length === 0) return { subscriptions: [], debug };

  // Step 4: build result — one notification per (subscription, event) pair.
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const eventIdsByUser = new Map<string, number[]>();
  for (const save of saves) {
    const saved = eventIdsByUser.get(save.user_id) ?? [];
    saved.push(save.event_id);
    eventIdsByUser.set(save.user_id, saved);
  }

  const subscriptions: ReminderSubscription[] = [];
  for (const sub of eligibleSubs) {
    for (const eventId of eventIdsByUser.get(sub.user_id) ?? []) {
      const event = eventMap.get(eventId);
      if (!event) continue;
      subscriptions.push({
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        eventTitle: event.title ?? "",
        eventSlug: event.slug ?? String(event.id),
        eventDate: event.startDate ?? todayBg,
        kind: event.startDate === tomorrowBg ? "tomorrow" : "today",
      });
    }
  }

  return { subscriptions, debug };
}

const BG_TIMEZONE = "Europe/Sofia";

function getBulgariaDateParts(): { date: string; hour: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BG_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
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

/** Tomorrow's date as YYYY-MM-DD in Bulgaria. Advances the calendar date
 *  rather than adding 24 hours, so DST changeovers stay correct. */
export function getTomorrowInBulgaria(): string {
  const next = new Date(`${getTodayInBulgaria()}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Current hour in Bulgaria as zero-padded "HH". */
export function getCurrentHourInBulgaria(): string {
  return getBulgariaDateParts().hour;
}

export const pushSubscriptionsApi = {
  savePushSubscription,
  deletePushSubscription,
  deletePushSubscriptionsByEndpoints,
  hasPushSubscription,
  logPushEnableFailure,
  getDueReminders,
};
