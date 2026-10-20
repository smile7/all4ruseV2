"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { Button } from "~/components/ui/button";
import { detectStandaloneApp } from "~/lib/analytics/track-pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithClientHints = Navigator & {
  userAgentData?: { platform?: string; mobile?: boolean };
};

function isInstallPrompt(event: Event): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof event.prompt === "function";
}

function isIos(): boolean {
  const nav = navigator as NavigatorWithClientHints;
  if (nav.userAgentData?.platform === "iOS") return true;
  if (/iPhone|iPad|iPod/i.test(nav.userAgent)) return true;
  return nav.platform === "MacIntel" && nav.maxTouchPoints > 1;
}

function isPhone(): boolean {
  if (!window.matchMedia("(max-width: 767px)").matches) return false;
  const nav = navigator as NavigatorWithClientHints;
  if (nav.userAgentData?.mobile === false) return false;
  if (nav.userAgentData?.mobile === true) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent);
}

function subscribeToPhoneWidth(onChange: () => void): () => void {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function installOfferAvailable(): boolean {
  return isPhone() && !detectStandaloneApp();
}

/**
 * Text install control under the home title, phones only.
 * Hidden once the site is already running as the installed app.
 * Browsers that expose an install dialog open it. Every other browser gets
 * a short instruction for its own menu.
 */
export function PwaInstallOffer() {
  const t = useTranslations("PwaInstall");
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const offer = useSyncExternalStore(
    subscribeToPhoneWidth,
    installOfferAvailable,
    () => false,
  );

  useEffect(() => {
    if (detectStandaloneApp()) return;

    const onBeforeInstall = (event: Event) => {
      if (!isInstallPrompt(event) || detectStandaloneApp() || !isPhone()) {
        return;
      }
      event.preventDefault();
      setPromptEvent(event);
    };

    const onInstalled = () => {
      setPromptEvent(null);
      setHintOpen(false);
      setHidden(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || !offer) return null;

  async function install() {
    const event = promptEvent;
    if (!event) {
      setHintOpen((open) => !open);
      return;
    }
    setPromptEvent(null);
    setHintOpen(false);
    setHidden(true);
    try {
      await event.prompt();
    } catch {
      setHidden(false);
      setHintOpen(true);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 md:hidden">
      <Button
        type="button"
        variant="outline"
        aria-expanded={promptEvent ? undefined : hintOpen}
        className="h-auto w-full text-center whitespace-normal"
        onClick={() => void install()}
      >
        {t("install")}
      </Button>
      {hintOpen && (
        <p role="status" className="text-muted-foreground max-w-sm text-sm">
          {isIos() ? t("iosHint") : t("menuHint")}
        </p>
      )}
    </div>
  );
}
