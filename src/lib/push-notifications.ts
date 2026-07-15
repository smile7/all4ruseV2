import webpush from "web-push";

import type { ReminderSubscription } from "~/lib/api/push-subscriptions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:contact@all4ruse.com";

const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "notify.windows.com",
  "web.push.apple.com",
  "push.apple.com",
] as const;

/** Rejects non-HTTPS or non-provider endpoints to prevent SSRF via stored subscriptions. */
function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") return false;
    return ALLOWED_PUSH_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function getWebPush() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID keys are not configured.");
  }
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return webpush;
}

type PushPayload = {
  title: string;
  body: string;
  url: string;
  icon?: string;
};

type SendPushResult =
  | { ok: true }
  | { ok: false; gone: boolean; invalid: boolean };

async function sendPushNotification(
  sub: Pick<ReminderSubscription, "endpoint" | "p256dh" | "auth">,
  payload: PushPayload,
): Promise<SendPushResult> {
  if (!isAllowedPushEndpoint(sub.endpoint)) {
    return { ok: false, gone: false, invalid: true };
  }

  const wp = getWebPush();
  try {
    await wp.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // deliver within 24 h if device is offline
    );
    return { ok: true };
  } catch (err: unknown) {
    // 410 Gone = subscription expired/revoked; caller should delete it.
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : 0;
    return { ok: false, gone: statusCode === 410, invalid: false };
  }
}

/**
 * Builds the notification payload for an event reminder.
 * All copy is in Bulgarian (all users are in Ruse).
 */
function buildReminderPayload(
  eventTitle: string,
  eventSlug: string,
  baseUrl: string,
): PushPayload {
  return {
    title: "Напомняне за събитие",
    body: `Събитието „${eventTitle}" е днес!`,
    url: `${baseUrl}/bg/${eventSlug}`,
    icon: "/android-chrome-192x192.png",
  };
}

export const pushNotificationsLib = {
  sendPushNotification,
  buildReminderPayload,
  isAllowedPushEndpoint,
  VAPID_PUBLIC_KEY,
};
