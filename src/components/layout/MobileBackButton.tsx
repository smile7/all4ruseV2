"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import { usePathname, useRouter } from "~/i18n/navigation";

const SAFE_HISTORY_KEY = "__all4ruseSafeHistory";

type SafeHistoryEntry = {
  depth: number;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSafeHistoryEntry(state: unknown): SafeHistoryEntry | null {
  if (!isRecord(state)) return null;

  const entry = state[SAFE_HISTORY_KEY];
  if (
    !isRecord(entry) ||
    typeof entry.depth !== "number" ||
    typeof entry.url !== "string"
  ) {
    return null;
  }

  return { depth: entry.depth, url: entry.url };
}

function getCurrentUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function MobileBackButton() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const router = useRouter();
  const safeBackDepth = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    const currentUrl = getCurrentUrl();
    const existingEntry = getSafeHistoryEntry(window.history.state);

    if (existingEntry?.url === currentUrl) {
      safeBackDepth.current = existingEntry.depth;
      initialized.current = true;
      return;
    }

    const hasSameOriginReferrer = (() => {
      if (!document.referrer || window.history.length <= 1) return false;

      try {
        return new URL(document.referrer).origin === window.location.origin;
      } catch {
        return false;
      }
    })();

    safeBackDepth.current = initialized.current
      ? safeBackDepth.current + 1
      : hasSameOriginReferrer
        ? 1
        : 0;
    initialized.current = true;

    const currentState = isRecord(window.history.state)
      ? window.history.state
      : {};

    window.history.replaceState(
      {
        ...currentState,
        [SAFE_HISTORY_KEY]: {
          depth: safeBackDepth.current,
          url: currentUrl,
        } satisfies SafeHistoryEntry,
      },
      "",
    );
  }, [pathname]);

  function handleBack() {
    const currentEntry = getSafeHistoryEntry(window.history.state);
    const currentUrl = getCurrentUrl();
    const depth =
      currentEntry?.url === currentUrl
        ? currentEntry.depth
        : safeBackDepth.current;

    if (depth > 0) {
      router.back();
      return;
    }

    if (pathname !== "/") {
      router.push("/");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-9 shrink-0"
      onClick={handleBack}
      aria-label={t("back")}
    >
      <ArrowLeft className="size-5" aria-hidden />
    </Button>
  );
}
