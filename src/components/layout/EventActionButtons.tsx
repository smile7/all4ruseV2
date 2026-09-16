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
import { TrackedLink } from "~/components/TrackedLink";
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
          <TrackedLink
            eventKey="event.buy_tickets"
            href={ticketsLink}
            target="_blank"
            rel="noopener"
          >
            <Ticket className="size-4 shrink-0" />
            {t("buyTickets")}
          </TrackedLink>
        </Button>
      )}
      {fbLink && (
        <Button
          variant="secondary"
          asChild
          className="w-full justify-start gap-2"
        >
          <TrackedLink
            eventKey="event.facebook"
            href={fbLink}
            target="_blank"
            rel="noopener"
          >
            <ExternalLink className="size-4 shrink-0" />
            {t("facebook")}
          </TrackedLink>
        </Button>
      )}
      <EventSaveButton eventId={eventId} variant="button" />
      <Button
        variant="secondary"
        asChild
        className="w-full justify-start gap-2"
      >
        <TrackedLink
          eventKey="event.add_to_calendar"
          href={gcalUrl}
          target="_blank"
          rel="noopener"
        >
          <CalendarPlus className="size-4 shrink-0" />
          {t("addToCalendar")}
        </TrackedLink>
      </Button>
      {hostProfileUsername && (
        <Button
          variant="secondary"
          asChild
          className="w-full justify-start gap-2"
        >
          <TrackedLink
            eventKey="event.organizer"
            href={`/user/${hostProfileUsername}`}
          >
            <User className="size-4 shrink-0" />
            {t("organizer")}
          </TrackedLink>
        </Button>
      )}
      <Button asChild className="w-full justify-start gap-2">
        <TrackedLink
          eventKey="event.share_facebook"
          href={fbShareUrl}
          target="_blank"
          rel="noopener"
        >
          <Share2 className="size-4 shrink-0" />
          {t("shareOnFacebook")}
        </TrackedLink>
      </Button>
      <EventClaimAction eventId={eventId} createdBy={createdBy} />
    </>
  );
}
