/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  PrecacheEntry,
  Serwist,
  SerwistGlobalConfig,
  StaleWhileRevalidate,
} from "serwist";

import {
  reportPushEnableFailure,
  urlBase64ToUint8Array,
  VAPID_PUBLIC_KEY,
} from "~/lib/push-client";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * MINIMAL service worker — safe for Next.js App Router + Supabase SSR.
 *
 * Only static assets and icons are cached. All navigation, RSC/Flight
 * requests, API routes, and auth redirects go straight to the network.
 * Caching those would break Supabase SSR auth (infinite loading, stale state).
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Next.js static chunk files — cache-first, long TTL
    {
      matcher: /^\/_next\/static\/.*/i,
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },
    // Public images and icons — stale-while-revalidate
    {
      matcher: /\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },
  ],
  // No navigation fallback — let Next.js middleware + Supabase SSR handle all
  // routing, auth redirects, and RSC requests natively.
});

serwist.addEventListeners();

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  type PushPayload = {
    title: string;
    body: string;
    url: string;
    icon?: string;
    tag?: string;
  };

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
      data: { url: payload.url },
      // Deduplicate resends of the same reminder. The sender varies the tag per
      // reminder kind so the day-of notice doesn't quietly replace the day-before.
      tag: payload.tag ?? payload.url,
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const url: string = (event.notification.data as { url?: string })?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url === url && "focus" in c);
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      }),
  );
});

/**
 * Browsers rotate push subscriptions on their own. Without re-registering, the
 * old endpoint starts returning 410, the reminder cron deletes the row, and the
 * user silently stops receiving notifications. Same-origin fetch carries the
 * auth cookie, so this works with no page open.
 */
async function reregisterRotatedSubscription(
  event: PushSubscriptionChangeEvent,
): Promise<void> {
  const oldEndpoint = event.oldSubscription?.endpoint;

  try {
    const sub =
      event.newSubscription ??
      (await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const keys = sub.toJSON().keys;
    if (!keys?.p256dh || !keys.auth) {
      throw new Error("Rotated subscription is missing keys.");
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if (oldEndpoint && oldEndpoint !== sub.endpoint) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: oldEndpoint }),
      });
    }
  } catch (err) {
    await reportPushEnableFailure(
      "sw_resubscribe_failed",
      err instanceof Error ? err.message : "Unknown error",
    );
  }
}

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(reregisterRotatedSubscription(event));
});
