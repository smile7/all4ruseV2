/**
 * Browser-side push helpers shared by the React hook and the service worker.
 * Must stay free of server-only imports so `src/app/sw.ts` can bundle it.
 */

import { type FailureStage, reportFailure } from "~/lib/failures";

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

/**
 * Records why an attempt to turn reminders on failed, together with the
 * current notification permission. Best-effort, like every failure report.
 */
export async function reportPushEnableFailure(
  stage: FailureStage<"push_enable">,
  message?: string,
): Promise<void> {
  await reportFailure({
    flow: "push_enable",
    stage,
    message,
    metadata:
      typeof Notification === "undefined"
        ? undefined
        : { permission: Notification.permission },
  });
}
