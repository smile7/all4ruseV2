"use client";

import type { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  enablePushNotifications,
  isEligibleForReminderPrompt,
} from "~/hooks/usePushNotifications";
import {
  abortReminderPromptCheck,
  beginReminderPromptCheck,
  commitReminderPrompt,
} from "~/lib/reminder-prompt";

type SavedEventsT = ReturnType<typeof useTranslations<"SavedEvents">>;

async function enableFromPrompt(t: SavedEventsT) {
  const result = await enablePushNotifications();

  if (result.status === "subscribed") {
    toast.success(t("remindersActive"));
    return;
  }

  if (result.status === "denied") {
    toast.info(t("remindersDenied"));
    return;
  }

  toast.error(t("remindersError"));
}

/** After a successful save, offer to enable day-of-event reminders. */
export async function promptRemindersOnSave(t: SavedEventsT) {
  if (!beginReminderPromptCheck()) return;

  try {
    const eligible = await isEligibleForReminderPrompt();
    if (!eligible) {
      abortReminderPromptCheck();
      return;
    }

    commitReminderPrompt();

    const toastId = toast.success(t("saved"), {
      description: (
        <span className="flex flex-col items-start gap-2.5">
          <span>{t("remindersPromptDescription")}</span>
          <Button
            type="button"
            size="sm"
            className="bg-background text-foreground hover:bg-background/90"
            onClick={() => {
              toast.dismiss(toastId);
              void enableFromPrompt(t);
            }}
          >
            {t("remindersEnable")}
          </Button>
        </span>
      ),
      duration: 10_000,
      closeButton: true,
    });
  } catch {
    abortReminderPromptCheck();
  }
}
