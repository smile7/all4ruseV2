"use client";

import { useTranslations } from "next-intl";

import { Pencil } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useAuth } from "~/contexts/AuthContext";
import { isEventBotUserId } from "~/lib/auth/event-bot";

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";

type Props = {
  locale: string;
  eventId: number;
  createdBy: string | null;
};

/** Gated on the client so the event page itself can stay statically cached. */
export function EventEditButton({ locale, eventId, createdBy }: Props) {
  const { userId } = useAuth();
  const t = useTranslations("SingleEvent");

  const canEdit =
    Boolean(userId) &&
    (userId === createdBy ||
      (ADMIN_USER_ID !== "" && userId === ADMIN_USER_ID) ||
      isEventBotUserId(userId));

  if (!canEdit) return null;

  return (
    <Button variant="outline" asChild className="w-full justify-start gap-2">
      <a href={`/${locale}/create-event?editId=${eventId}`}>
        <Pencil className="size-4 shrink-0" />
        {t("editEvent")}
      </a>
    </Button>
  );
}
