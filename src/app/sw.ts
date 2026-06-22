/// <reference lib="webworker" />
import { CacheFirst, ExpirationPlugin, PrecacheEntry, Serwist, SerwistGlobalConfig, StaleWhileRevalidate } from "serwist";

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
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
      }),
    },
    // Public images and icons — stale-while-revalidate
    {
      matcher: /\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "images",
        plugins: [
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
      }),
    },
  ],
  // No navigation fallback — let Next.js middleware + Supabase SSR handle all
  // routing, auth redirects, and RSC requests natively.
});

serwist.addEventListeners();
