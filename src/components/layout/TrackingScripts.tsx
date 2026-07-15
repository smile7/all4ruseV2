"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useCookieConsent } from "~/hooks/useCookieConsent";
import {
  hasAnalyticsConsent,
  hasMarketingConsent,
} from "~/lib/cookie-consent";

const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Gtag = (...args: unknown[]) => void;

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: (...args: unknown[]) => void;
  loaded?: boolean;
  version?: string;
};

type TrackingWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: Gtag;
  fbq?: Fbq;
  _fbq?: Fbq;
  __a4rGaInitialized?: boolean;
  __a4rMetaPixelInitialized?: boolean;
};

function getTrackingWindow(): TrackingWindow {
  return window as TrackingWindow;
}

function ensureScript(id: string, src: string) {
  if (document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function ensureGoogleAnalytics(win: TrackingWindow, trackingId: string) {
  win.dataLayer = win.dataLayer ?? [];
  win.gtag =
    win.gtag ??
    ((...args: unknown[]) => {
      win.dataLayer?.push(args);
    });

  ensureScript(
    "a4r-google-analytics",
    `https://www.googletagmanager.com/gtag/js?id=${trackingId}`,
  );

  if (win.__a4rGaInitialized) return;

  win.gtag("js", new Date());
  win.gtag("config", trackingId, { send_page_view: false });
  win.__a4rGaInitialized = true;
}

function ensureMetaPixel(win: TrackingWindow, trackingId: string) {
  if (!win.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (typeof fbq.callMethod === "function") {
        fbq.callMethod(...args);
        return;
      }

      fbq.queue?.push(args);
    }) as Fbq;

    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = (...args: unknown[]) => fbq(...args);

    win.fbq = fbq;
    win._fbq = fbq;
  }

  ensureScript(
    "a4r-meta-pixel",
    "https://connect.facebook.net/en_US/fbevents.js",
  );

  if (win.__a4rMetaPixelInitialized) return;

  win.fbq("init", trackingId);
  win.__a4rMetaPixelInitialized = true;
}

function trackGooglePageView(
  win: TrackingWindow,
  trackingId: string,
  pathname: string,
) {
  ensureGoogleAnalytics(win, trackingId);
  win.gtag?.("event", "page_view", {
    page_path: pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
}

function trackMetaPageView(win: TrackingWindow, trackingId: string) {
  ensureMetaPixel(win, trackingId);
  win.fbq?.("track", "PageView");
}

export function TrackingScripts() {
  const pathname = usePathname();
  const [consent] = useCookieConsent();
  const lastGaPathRef = useRef<string | null>(null);
  const lastMetaPathRef = useRef<string | null>(null);

  const analyticsEnabled = Boolean(
    googleAnalyticsId && hasAnalyticsConsent(consent),
  );
  const marketingEnabled = Boolean(metaPixelId && hasMarketingConsent(consent));

  useEffect(() => {
    if (!pathname) return;

    const win = getTrackingWindow();

    if (analyticsEnabled && googleAnalyticsId) {
      if (lastGaPathRef.current !== pathname) {
        trackGooglePageView(win, googleAnalyticsId, pathname);
        lastGaPathRef.current = pathname;
      }
    } else {
      lastGaPathRef.current = null;
    }

    if (marketingEnabled && metaPixelId) {
      if (lastMetaPathRef.current !== pathname) {
        trackMetaPageView(win, metaPixelId);
        lastMetaPathRef.current = pathname;
      }
    } else {
      lastMetaPathRef.current = null;
    }
  }, [analyticsEnabled, marketingEnabled, pathname]);

  return null;
}