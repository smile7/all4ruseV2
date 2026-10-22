"use client";

import {
  cloneElement,
  isValidElement,
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";

import { Download } from "lucide-react";

import { Button } from "~/components/ui/button";
import { trackClick } from "~/lib/analytics/track-click";
import { detectStandaloneApp } from "~/lib/analytics/track-pwa";
import { cn } from "~/lib/utils";

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

function shareRow(child: ReactNode): ReactNode {
  if (!isValidElement<{ className?: string }>(child)) return child;
  return cloneElement(child, {
    className: cn("min-w-0 flex-1", child.props.className),
  });
}

type PwaInstallOfferProps = {
  children: ReactNode;
};

/**
 * Home title actions. On a phone that has not installed the app, the install
 * control sits on the same row as `children` (the create-event button).
 * Browsers that expose an install dialog open it. Every other browser gets
 * a short instruction for its own menu.
 */
export function PwaInstallOffer({ children }: PwaInstallOfferProps) {
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

  const showButton = !hidden && offer;

  async function install() {
    trackClick("home.install_app");
    const event = promptEvent;
    if (!event) {
      setHintOpen((open) => !open);
      return;
    }
    setHintOpen(false);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setPromptEvent(null);
      if (choice.outcome === "accepted") setHidden(true);
    } catch {
      setPromptEvent(null);
      setHintOpen(true);
    }
  }

  return (
    <div className="mt-2 flex w-full flex-col items-center gap-2">
      <div
        className={cn(
          "flex w-full items-stretch gap-2",
          showButton ? "justify-between" : "justify-center",
        )}
      >
        {showButton && (
          <Button
            type="button"
            variant="secondary"
            aria-expanded={promptEvent ? undefined : hintOpen}
            className="h-auto min-w-0 flex-1 px-3 whitespace-normal"
            onClick={() => void install()}
          >
            <Download aria-hidden />
            {t("install")}
          </Button>
        )}
        {showButton ? shareRow(children) : children}
      </div>
      {showButton && hintOpen && (
        <p
          role="status"
          className="text-muted-foreground max-w-sm text-center text-sm"
        >
          {isIos() ? t("iosHint") : t("menuHint")}
        </p>
      )}
    </div>
  );
}
