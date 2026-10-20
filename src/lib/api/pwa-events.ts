import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PwaDisplayMode,
  PwaEventName,
  PwaLaunchSource,
  PwaPlatform,
} from "~/lib/analytics/pwa-events";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

type RecordPwaEventInput = {
  visitorId: string;
  eventName: PwaEventName;
  platform: PwaPlatform;
  displayMode: PwaDisplayMode;
  launchSource: PwaLaunchSource | null;
  userAgent: string | null;
  durationSeconds: number | null;
};

async function recordPwaEvent(
  client: Client,
  input: RecordPwaEventInput,
): Promise<void> {
  const { error } = await client.rpc("record_pwa_event", {
    p_visitor_id: input.visitorId,
    p_event_name: input.eventName,
    p_platform: input.platform,
    p_display_mode: input.displayMode,
    ...(input.launchSource ? { p_launch_source: input.launchSource } : {}),
    ...(input.userAgent ? { p_user_agent: input.userAgent } : {}),
    ...(input.durationSeconds != null
      ? { p_duration_seconds: input.durationSeconds }
      : {}),
  });
  if (error) throw error;
}

export const pwaEventsApi = {
  recordPwaEvent,
};
