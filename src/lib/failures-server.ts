import { type FailureLogInput, failuresApi } from "~/lib/api/failures";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";

import "server-only";

/**
 * Server-side failure recording for API routes. Never throws, so a diagnostics
 * outage can't change the response the user gets.
 */
export async function recordFailure(input: FailureLogInput): Promise<void> {
  try {
    await failuresApi.logFailure(createSupabaseAdminClient(), input);
  } catch (err) {
    console.error(
      "[failures] could not record",
      input.flow,
      input.stage,
      err instanceof Error ? err.message : err,
    );
  }
}
