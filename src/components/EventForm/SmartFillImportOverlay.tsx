"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";
import { cn } from "~/lib/utils";

import "~/styles/smart-fill-arcade-loaders.css";

const ARCADE_LOADER_COUNT = 10;

function pickRandomLoaderIndex() {
  return Math.floor(Math.random() * ARCADE_LOADER_COUNT) + 1;
}

function subscribeNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

type Props = {
  onCancel: () => void;
};

export function SmartFillImportOverlay({ onCancel }: Props) {
  const t = useTranslations("SmartFill");
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [loaderIndex] = useState(pickRandomLoaderIndex);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!isClient) return null;

  return createPortal(
    <div
      className="bg-background/75 fixed inset-0 z-[200] flex flex-col items-center justify-center px-4 backdrop-blur-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-fill-import-title"
      aria-describedby="smart-fill-import-desc"
    >
      <div className="flex max-w-sm flex-col items-center gap-6 text-center">
        <div
          className="smart-fill-arcade-loader-stage border-foreground/80 bg-background/50 rounded-lg border-2 p-5"
          aria-hidden
        >
          <div className={cn(`smart-fill-arcade-loader-${loaderIndex}`)} />
        </div>

        <div className="space-y-2">
          <p id="smart-fill-import-title" className="text-lg font-medium">
            {t("parsing")}
          </p>
          <p
            id="smart-fill-import-desc"
            className="text-muted-foreground text-sm"
          >
            {t("parsingHint")}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("loadingCancel")}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/my-events" onClick={onCancel}>
              {t("loadingLeave")}
            </Link>
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">{t("loadingLeaveHint")}</p>
      </div>
    </div>,
    document.body,
  );
}
