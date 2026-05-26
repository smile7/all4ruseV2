import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";

import { eventsApi } from "~/lib/api/events";
import type { Event } from "~/types";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;
type SavedEventsTiming = "upcoming" | "past";

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

async function getSavedEventIds(
  client: Client,
  userId: string,
): Promise<number[]> {
  const { data, error } = await client
    .from("saved_events")
    .select("event_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => row.event_id);
}

async function getSavedEventsCount(
  client: Client,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from("saved_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

async function getSavedEvents(
  client: Client,
  userId: string,
  timing: SavedEventsTiming,
): Promise<Event[]> {
  const ids = await getSavedEventIds(client, userId);
  if (ids.length === 0) return [];

  const today = todayStr();
  const events = await eventsApi.getEventsByIds(client, ids);

  if (timing === "upcoming") {
    return events
      .filter((event) => event.endDate >= today)
      .sort(
        (left, right) =>
          left.startDate.localeCompare(right.startDate) ||
          left.startTime.localeCompare(right.startTime),
      );
  }

  return events
    .filter((event) => event.endDate < today)
    .sort(
      (left, right) =>
        right.endDate.localeCompare(left.endDate) ||
        right.startDate.localeCompare(left.startDate) ||
        right.startTime.localeCompare(left.startTime),
    );
}

async function saveEvent(
  client: Client,
  userId: string,
  eventId: number,
): Promise<void> {
  const { data: existing, error: existingError } = await client
    .from("saved_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return;

  const { error } = await client.from("saved_events").insert({
    event_id: eventId,
    user_id: userId,
  });

  if (error) throw error;
}

async function unsaveEvent(
  client: Client,
  userId: string,
  eventId: number,
): Promise<void> {
  const { error } = await client
    .from("saved_events")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) throw error;
}

export const savedEventsApi = {
  getSavedEventIds,
  getSavedEventsCount,
  getSavedEvents,
  saveEvent,
  unsaveEvent,
};
