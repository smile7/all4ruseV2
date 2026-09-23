/**
 * Failure diagnostics shared by the browser, the service worker, and the
 * server. Must stay free of server-only imports so `src/app/sw.ts` can bundle
 * it. Rows land in the `flow_failures` table; there is no external log service.
 *
 * Stages caused by the user rather than by us (cancelling a provider login,
 * an already registered email, hitting the daily limit, invalid input) have
 * their own names so they can be filtered out when looking for real bugs.
 */
export const FAILURE_STAGES = {
  push_enable: [
    "no_vapid_key",
    "permission_denied",
    "no_service_worker",
    "missing_keys",
    "save_rejected",
    "subscribe_threw",
    "sw_resubscribe_failed",
  ],
  smart_fill: [
    "invalid_input",
    "daily_limit",
    "rate_limit_check_failed",
    "visibility_check_failed",
    "scrape_empty",
    "scrape_failed",
    "ai_quota_exceeded",
    "extraction_failed",
    "image_upload_failed",
    "image_reupload_failed",
  ],
  auth: [
    "oauth_start_failed",
    "provider_cancelled",
    "provider_error",
    "callback_missing_code",
    "code_exchange_failed",
    "profile_bootstrap_failed",
    "confirm_invalid_link",
    "confirm_failed",
    "captcha_failed",
    "signup_failed",
    "already_registered",
  ],
} as const;

export type FailureFlow = keyof typeof FAILURE_STAGES;

export type FailureStage<F extends FailureFlow> =
  (typeof FAILURE_STAGES)[F][number];

export type FailureMetadata = Record<string, string>;

export type FailureReport = {
  [F in FailureFlow]: { flow: F; stage: FailureStage<F> };
}[FailureFlow] & {
  message?: string | null;
  metadata?: FailureMetadata;
};

export const FAILURE_MESSAGE_MAX_LENGTH = 500;

/** Handles Error instances, strings, and Supabase error objects alike. */
export function getFailureMessage(error: unknown): string | null {
  if (typeof error === "string") return error;
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return null;
}

/**
 * Browser-side reporting for flows that fail before reaching our server.
 * Best-effort: never throws and never affects the caller's outcome.
 */
export async function reportFailure(report: FailureReport): Promise<void> {
  try {
    await fetch("/api/failures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...report,
        message: report.message?.slice(0, FAILURE_MESSAGE_MAX_LENGTH),
      }),
    });
  } catch {
    // Diagnostics only.
  }
}
