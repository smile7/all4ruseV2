"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Download } from "lucide-react";

import { Button } from "~/components/ui/button";
import { detectStandaloneApp } from "~/lib/analytics/track-pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isInstallPrompt(event: Event): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof event.prompt === "function";
}

function isAndroidPhone(): boolean {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string; mobile?: boolean };
  };
  const android =
    nav.userAgentData?.platform === "Android" || /Android/i.test(nav.userAgent);
  if (!android) return false;
  if (nav.userAgentData?.mobile === false) return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Round install button, opposite the back-to-top control.
 * Android phones only, and only while the app is not installed.
 * The click opens the browser's own install dialog.
 */
export function PwaInstallOffer() {
  const t = useTranslations("PwaInstall");
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (detectStandaloneApp()) return;

    const onBeforeInstall = (event: Event) => {
      if (
        !isInstallPrompt(event) ||
        detectStandaloneApp() ||
        !isAndroidPhone()
      ) {
        return;
      }
      event.preventDefault();
      setPromptEvent(event);
    };

    const onInstalled = () => {
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  async function install() {
    const event = promptEvent;
    if (!event) return;
    setPromptEvent(null);
    try {
      await event.prompt();
    } catch {
      // The browser refused the dialog. The button can return on a later visit.
    }
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label={t("install")}
      className="bg-secondary/70 hover:bg-secondary fixed bottom-20 left-4 z-50 size-11 rounded-full shadow-lg md:hidden"
      onClick={() => void install()}
    >
      <Download className="size-5" aria-hidden />
    </Button>
  );
}
