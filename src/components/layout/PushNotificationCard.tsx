"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Bell, BellOff, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { usePushNotifications } from "~/hooks/usePushNotifications";

const REMINDER_HOURS = [
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
] as const;

function normalizeReminderHour(hour: string) {
  const numericHour = Number.parseInt(hour, 10);

  if (Number.isNaN(numericHour)) {
    return "09";
  }

  if (numericHour < 5) {
    return "05";
  }

  if (numericHour > 14) {
    return "14";
  }

  return numericHour.toString().padStart(2, "0");
}

type Props = {
  /** The user's current reminder_time from their profile (e.g. "09:00") */
  currentReminderTime: string;
};

export function PushNotificationCard({ currentReminderTime }: Props) {
  const t = useTranslations("SavedEvents");
  const {
    isReady,
    isPushCapable,
    hasServiceWorker,
    permission,
    isSubscribed,
    isLoading,
    error,
    enable,
    disable,
    refresh,
  } = usePushNotifications();

  const initialHour = normalizeReminderHour(currentReminderTime.slice(0, 2));
  const [selectedHour, setSelectedHour] = useState<string>(initialHour);
  const [savedHour, setSavedHour] = useState<string>(initialHour);
  const [isSavingTime, setIsSavingTime] = useState(false);

  async function handleReminderTimeChange(nextHour: string) {
    if (isSavingTime || nextHour === savedHour) {
      setSelectedHour(nextHour);
      return;
    }

    const previousHour = savedHour;
    setSelectedHour(nextHour);
    setIsSavingTime(true);

    try {
      const res = await fetch("/api/push/reminder-time", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderTime: `${nextHour}:00` }),
      });
      if (!res.ok) throw new Error();
      setSavedHour(nextHour);
      toast.success(t("remindersTimeSaved"));
    } catch {
      setSelectedHour(previousHour);
      toast.error(t("remindersError"));
    } finally {
      setIsSavingTime(false);
    }
  }

  function renderStatusMessage() {
    if (!isReady || isLoading) {
      return (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          <span>{t("remindersLoading")}</span>
        </div>
      );
    }

    if (!isPushCapable) {
      return (
        <p className="text-muted-foreground text-sm">
          {t("remindersUnsupported")}
        </p>
      );
    }

    if (!hasServiceWorker) {
      return (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {t("remindersServiceWorkerMissing")}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 size-4" />
            {t("remindersRetry")}
          </Button>
        </div>
      );
    }

    if (permission === "denied") {
      return (
        <p className="text-muted-foreground text-sm">{t("remindersDenied")}</p>
      );
    }

    if (isSubscribed) {
      return (
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          {t("remindersActive")}
        </p>
      );
    }

    return (
      <p className="text-muted-foreground text-sm">{t("remindersReady")}</p>
    );
  }

  function renderActions() {
    if (!isReady || isLoading || !isPushCapable || !hasServiceWorker) {
      return null;
    }

    if (permission === "denied") {
      return null;
    }

    return (
      <>
        <div className="flex items-center gap-3">
          <Button
            variant={isSubscribed ? "outline" : "default"}
            size="sm"
            onClick={isSubscribed ? disable : enable}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isSubscribed ? (
              <BellOff className="size-4" />
            ) : (
              <Bell className="size-4" />
            )}
            {isSubscribed ? t("remindersDisable") : t("remindersEnable")}
          </Button>
          {!isSubscribed && (
            <span className="text-muted-foreground text-sm">
              {t("remindersInactive")}
            </span>
          )}
        </div>

        {isSubscribed && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <span>{t("remindersTimeLabel")}</span>
                {isSavingTime && (
                  <Loader2 className="text-primary size-3.5 animate-spin" />
                )}
              </Label>
              <Select
                value={selectedHour}
                onValueChange={handleReminderTimeChange}
                disabled={isSavingTime}
              >
                <SelectTrigger className="w-28" aria-busy={isSavingTime}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_HOURS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isSubscribed && (
          <p className="text-muted-foreground text-xs">
            {t("remindersTimeHint")}
          </p>
        )}
      </>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="text-primary size-4" />
          {t("remindersCardTitle")}
        </CardTitle>
        <CardDescription>{t("remindersCardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderStatusMessage()}
        {error ? (
          <p className="text-destructive text-sm">{t("remindersError")}</p>
        ) : null}
        {renderActions()}
      </CardContent>
    </Card>
  );
}
