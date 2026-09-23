import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FAILURE_MESSAGE_MAX_LENGTH,
  type FailureMetadata,
  type FailureReport,
} from "~/lib/failures";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

export type FailureLogInput = FailureReport & {
  userId: string | null;
  userAgent?: string | null;
};

function boundMetadata(metadata: FailureMetadata = {}): FailureMetadata {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key.slice(0, 50),
      value.slice(0, 200),
    ]),
  );
}

/** Requires an admin client — the table is readable only via the service role. */
async function logFailure(
  client: Client,
  input: FailureLogInput,
): Promise<void> {
  const { error } = await client.from("flow_failures").insert({
    user_id: input.userId,
    flow: input.flow,
    stage: input.stage,
    message: input.message?.slice(0, FAILURE_MESSAGE_MAX_LENGTH) ?? null,
    metadata: boundMetadata(input.metadata),
    user_agent: input.userAgent?.slice(0, 300) ?? null,
  });
  if (error) throw error;
}

export const failuresApi = {
  logFailure,
};
