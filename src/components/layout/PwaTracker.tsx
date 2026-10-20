"use client";

import { useEffect } from "react";

import { PWA_NOTIFICATION_OPEN_MESSAGE } from "~/lib/analytics/pwa-events";
import {
  consumePwaLaunchSource,
  detectPwaDisplayMode,
  markStandaloneSession,
  pwaTrackingEnabled,
  standaloneSessionDurationSeconds,
  trackPwaEvent,
} from "~/lib/analytics/track-pwa";

type RelatedApp = { platform?: string };

function isBeforeInstallPromptEvent(
  event: Event,
): event is Event & { userChoice: Promise<{ outcome: string }> } {
  if (!("userChoice" in event)) return false;
  const choice = (event as { userChoice?: unknown }).userChoice;
  return (
    typeof choice === "object" &&
    choice !== null &&
    "then" in choice &&
    typeof choice.then === "function"
  );
}

async function hasRelatedWebApp(): Promise<boolean> {
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  };
  if (!nav.getInstalledRelatedApps) return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    return apps.some((app) => app.platform === "webapp");
  } catch {
    return false;
  }
}

/**
 * Records PWA install and usage signals. Renders nothing.
 * Install-prompt acceptance only arrives if the browser resolves `userChoice`;
 * the browser's own install icon does not always do that. `installed` still
 * fires from `appinstalled`.
 */
export function PwaTracker() {
  useEffect(() => {
    if (!pwaTrackingEnabled()) return;

    const launchSource = consumePwaLaunchSource();
    const displayMode = detectPwaDisplayMode();

    if (displayMode === "standalone") {
      markStandaloneSession();
      trackPwaEvent({ eventName: "standalone_open", launchSource });
      trackPwaEvent({ eventName: "related_installed", launchSource });
    } else {
      void hasRelatedWebApp().then((installed) => {
        if (installed) {
          trackPwaEvent({ eventName: "related_installed" });
        }
      });
    }

    if (launchSource === "notification") {
      trackPwaEvent({
        eventName: "notification_open",
        launchSource: "notification",
      });
    }

    const onBeforeInstall = (event: Event) => {
      trackPwaEvent({ eventName: "prompt_eligible" });
      if (!isBeforeInstallPromptEvent(event)) return;
      void event.userChoice.then((choice) => {
        if (choice.outcome === "accepted") {
          trackPwaEvent({ eventName: "prompt_accepted" });
        } else if (choice.outcome === "dismissed") {
          trackPwaEvent({ eventName: "prompt_dismissed" });
        }
      });
    };

    const onInstalled = () => {
      trackPwaEvent({ eventName: "installed" });
    };

    const onNotificationOpen = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data: unknown = event.data;
      if (
        typeof data !== "object" ||
        data === null ||
        !("type" in data) ||
        data.type !== PWA_NOTIFICATION_OPEN_MESSAGE
      ) {
        return;
      }
      trackPwaEvent({
        eventName: "notification_open",
        launchSource: "notification",
      });
    };

    let lastSentDuration = 0;
    const sendDuration = () => {
      if (detectPwaDisplayMode() !== "standalone") return;
      const duration = standaloneSessionDurationSeconds();
      if (duration == null || duration <= lastSentDuration) return;
      lastSentDuration = duration;
      trackPwaEvent({
        eventName: "standalone_open",
        durationSeconds: duration,
        launchSource,
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendDuration();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("pagehide", sendDuration);
    document.addEventListener("visibilitychange", onVisibility);
    navigator.serviceWorker?.addEventListener("message", onNotificationOpen);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("pagehide", sendDuration);
      document.removeEventListener("visibilitychange", onVisibility);
      navigator.serviceWorker?.removeEventListener(
        "message",
        onNotificationOpen,
      );
    };
  }, []);

  return null;
}
