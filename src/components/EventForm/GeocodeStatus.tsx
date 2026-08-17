"use client";

import { useTranslations } from "next-intl";

import { Loader2, MapPin, MapPinOff } from "lucide-react";

import { Button } from "~/components/ui/button";

export type GeocodeStatusKind = "on-map" | "failed" | "not-attempted";

type Props = {
  status: GeocodeStatusKind;
  isRetrying: boolean;
  onRetry: () => void;
};

export function GeocodeStatus({ status, isRetrying, onRetry }: Props) {
  const t = useTranslations("CreateEvent");
  const onMap = status === "on-map";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {onMap ? (
          <MapPin className="text-primary size-4 shrink-0" aria-hidden />
        ) : (
          <MapPinOff className="size-4 shrink-0" aria-hidden />
        )}
        {onMap
          ? t("geocodeOnMap")
          : status === "failed"
            ? t("geocodeFailed")
            : t("geocodeNotAttempted")}
      </p>
      {!onMap && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRetrying}
          onClick={onRetry}
        >
          {isRetrying ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {t("geocodeRetry")}
        </Button>
      )}
    </div>
  );
}
