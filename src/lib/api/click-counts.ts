import type { SupabaseClient } from "@supabase/supabase-js";

import { posterEventKey } from "~/lib/analytics/poster-campaign";
import type { TrackedEventKey } from "~/lib/analytics/tracked-events";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

async function incrementClick(
  client: Client,
  eventKey: TrackedEventKey,
): Promise<void> {
  const { error } = await client.rpc("increment_click_count", {
    p_event_key: eventKey,
  });
  if (error) throw error;
}

async function incrementPosterScan(
  client: Client,
  campaign: string,
): Promise<void> {
  const { error } = await client.rpc("increment_click_count", {
    p_event_key: posterEventKey(campaign),
  });
  if (error) throw error;
}

export const clickCountsApi = {
  incrementClick,
  incrementPosterScan,
};
