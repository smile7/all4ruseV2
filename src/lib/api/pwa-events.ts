import type { SupabaseClient } from "@supabase/supabase-js";

import type { PwaCountKey } from "~/lib/analytics/pwa-events";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

async function incrementPwaCount(
  client: Client,
  eventKey: PwaCountKey,
): Promise<void> {
  const { error } = await client.rpc("increment_pwa_count", {
    p_event_key: eventKey,
  });
  if (error) throw error;
}

export const pwaEventsApi = {
  incrementPwaCount,
};
