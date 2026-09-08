/**
 * Browser-side push helpers shared by the React hook and the service worker.
 * Must stay free of server-only imports so `src/app/sw.ts` can bundle it.
 */

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/** Mirrors the push_enable_failures_stage_check constraint in the database. */
export const PUSH_ENABLE_FAILURE_STAGES = [
  "no_vapid_key",
  "permission_denied",
  "no_service_worker",
  "missing_keys",
  "save_rejected",
  "subscribe_threw",
  "sw_resubscribe_failed",
] as const;

export type PushEnableFailureStage =
  (typeof PUSH_ENABLE_FAILURE_STAGES)[number];

/**
 * Records why an attempt to turn reminders on failed. There is no external log
 * service, so these land in Postgres where they can be queried directly.
 * Reporting is best-effort and never affects the caller's outcome.
 */
export async function reportPushEnableFailure(
  stage: PushEnableFailureStage,
  message?: string,
): Promise<void> {
  try {
    await fetch("/api/push/failures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage,
        message: message?.slice(0, 500),
        permission:
          typeof Notification === "undefined"
            ? undefined
            : Notification.permission,
      }),
    });
  } catch {
    // Diagnostics only.
  }
}
