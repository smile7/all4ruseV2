import { getTranslations } from "next-intl/server";

import {
  CalendarPlus,
  ExternalLink,
  Pencil,
  Share2,
  Ticket,
  User,
} from "lucide-react";

import { ClaimEventButton } from "~/components/ClaimEvent/ClaimEventButton";
import { EventSaveButton } from "~/components/EventCard";
import { Button } from "~/components/ui/button";
import type { ClaimStatus } from "~/lib/api/claims";

type Props = {
  locale: string;
  eventId: number;
  ticketsLink: string | null;
  fbLink: string | null;
  gcalUrl: string;
  fbShareUrl: string;
  isEventCreator: boolean;
  isAdmin?: boolean;
  hostProfileUsername: string | null | undefined;
  showClaimButton: boolean;
  initialClaimStatus: ClaimStatus | null;
};

export async function EventActionButtons({
  locale,
  eventId,
  ticketsLink,
  fbLink,
  gcalUrl,
  fbShareUrl,
  isEventCreator,
  isAdmin = false,
  hostProfileUsername,
  showClaimButton,
  initialClaimStatus,
}: Props) {
  const t = await getTranslations({ locale, namespace: "SingleEvent" });

  return (
    <>
      {(isEventCreator || isAdmin) && (
        <Button
          variant="outline"
          asChild
          className="w-full justify-start gap-2"
        >
          <a href={`/${locale}/create-event?editId=${eventId}`}>
            <Pencil className="size-4 shrink-0" />
            {t("editEvent")}
          </a>
        </Button>
      )}
      {ticketsLink && (
        <Button
          variant="secondary"
          asChild
          className="w-full justify-start gap-2"
        >
          <a href={ticketsLink} target="_blank" rel="noopener">
            <Ticket className="size-4 shrink-0" />
            {t("buyTickets")}
          </a>
        </Button>
      )}
      {fbLink && (
        <Button
          variant="secondary"
          asChild
          className="w-full justify-start gap-2"
        >
          <a href={fbLink} target="_blank" rel="noopener">
            <ExternalLink className="size-4 shrink-0" />
            {t("facebook")}
          </a>
        </Button>
      )}
      <EventSaveButton eventId={eventId} variant="button" />
      <Button
        variant="secondary"
        asChild
        className="w-full justify-start gap-2"
      >
        <a href={gcalUrl} target="_blank" rel="noopener">
          <CalendarPlus className="size-4 shrink-0" />
          {t("addToCalendar")}
        </a>
      </Button>
      {hostProfileUsername && (
        <Button
          variant="secondary"
          asChild
          className="w-full justify-start gap-2"
        >
          <a href={`/${locale}/user/${hostProfileUsername}`}>
            <User className="size-4 shrink-0" />
            {t("organizer")}
          </a>
        </Button>
      )}
      <Button asChild className="w-full justify-start gap-2">
        <a href={fbShareUrl} target="_blank" rel="noopener">
          <Share2 className="size-4 shrink-0" />
          {t("shareOnFacebook")}
        </a>
      </Button>
      {showClaimButton && (
        <ClaimEventButton
          eventId={eventId}
          initialClaimStatus={initialClaimStatus}
        />
      )}
    </>
  );
}
