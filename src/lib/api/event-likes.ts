import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

/** Totals keyed by event id. Events without likes are left out. */
async function getLikeCounts(
  client: Client,
  eventIds: number[],
): Promise<Record<number, number>> {
  if (eventIds.length === 0) return {};

  const { data, error } = await client
    .from("event_like_counts")
    .select("event_id, like_count")
    .in("event_id", eventIds)
    .gt("like_count", 0);

  if (error) throw error;

  const counts: Record<number, number> = {};
  for (const row of data ?? []) counts[row.event_id] = row.like_count;
  return counts;
}

/** Returns the new total after the like / unlike. */
async function setLiked(
  client: Client,
  eventId: number,
  liked: boolean,
): Promise<number> {
  const { data, error } = await client.rpc("change_event_like_count", {
    p_event_id: eventId,
    p_delta: liked ? 1 : -1,
  });
  if (error) throw error;
  return data;
}

export const eventLikesApi = {
  getLikeCounts,
  setLiked,
};
