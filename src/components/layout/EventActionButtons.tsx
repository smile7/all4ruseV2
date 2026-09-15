import { getTranslations } from "next-intl/server";

import {
  CalendarPlus,
  ExternalLink,
  Share2,
  Ticket,
  User,
} from "lucide-react";

import { EventSaveButton } from "~/components/EventCard";
import {
  EventClaimAction,
  EventEditButton,
} from "~/components/EventUserActions";
import { Button } from "~/components/ui/button";

type Props = {
  locale: string;
  eventId: number;
  ticketsLink: string | null;
  fbLink: string | null;
  gcalUrl: string;
  fbShareUrl: string;
  createdBy: string | null;
  hostProfileUsername: string | null | undefined;
};

export async function EventActionButtons({
  locale,
  eventId,
  ticketsLink,
  fbLink,
  gcalUrl,
  fbShareUrl,
  createdBy,
  hostProfileUsername,
}: Props) {
  const t = await getTranslations({ locale, namespace: "SingleEvent" });

  return (
    <>
      <EventEditButton
        locale={locale}
        eventId={eventId}
        createdBy={createdBy}
      />
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
      <EventClaimAction eventId={eventId} createdBy={createdBy} />
    </>
  );
}
