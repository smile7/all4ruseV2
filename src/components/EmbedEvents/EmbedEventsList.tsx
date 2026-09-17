import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { addDays, format } from "date-fns";
import { ArrowRight } from "lucide-react";

import { TrackedLink } from "~/components/TrackedLink";
import { Button } from "~/components/ui/button";
import type { Locale } from "~/constants";
import {
  formatDateBadge,
  formatEventTitle,
  formatTime,
  getEventImageUrl,
  getIntlLocale,
  parseLocalDate,
  todayInSofia,
} from "~/lib/event-utils";
import { cn } from "~/lib/utils";
import type { Event } from "~/types";

type Props = {
  events: Event[];
  locale: Locale;
  siteUrl: string;
};

function eventHref(
  siteUrl: string,
  locale: Locale,
  event: Event,
): string | null {
  if (typeof event.slug !== "string" || event.slug.trim() === "") return null;
  return `${siteUrl}/${locale}/${event.slug.trim()}`;
}

function dateLabel(
  startDate: string,
  locale: Locale,
  todayIso: string,
  tomorrowIso: string,
  labels: { today: string; tomorrow: string },
): string {
  const intlLocale = getIntlLocale(locale);
  if (startDate <= todayIso) {
    return labels.today.toLocaleUpperCase(intlLocale);
  }
  if (startDate === tomorrowIso) {
    return labels.tomorrow.toLocaleUpperCase(intlLocale);
  }
  return formatDateBadge(startDate, locale).primary;
}

export async function EmbedEventsList({ events, locale, siteUrl }: Props) {
  const t = await getTranslations({ locale, namespace: "EmbedEvents" });
  const homeHref = `${siteUrl}/${locale}`;
  const todayIso = todayInSofia();
  const tomorrowIso = format(
    addDays(parseLocalDate(todayIso), 1),
    "yyyy-MM-dd",
  );
  const relativeLabels = { today: t("today"), tomorrow: t("tomorrow") };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-border/60 bg-background flex shrink-0 items-center gap-7.5 border-b px-3 py-2.5">
        <TrackedLink
          eventKey="embed.see_more"
          href={homeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
          aria-label={t("logoAlt")}
        >
          <Image
            src="/all4ruse-logo-dark.svg"
            alt={t("logoAlt")}
            width={183}
            height={40}
            sizes="146px"
            quality={90}
            className="h-8 w-auto object-contain"
          />
        </TrackedLink>
        <h1 className="text-muted-foreground min-w-0 truncate text-sm leading-none font-medium">
          {t("heading")}
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {t("empty")}
          </p>
        ) : (
          <ul>
            {events.map((event) => {
              const href = eventHref(siteUrl, locale, event);
              const title = formatEventTitle(event.title);
              const time = formatTime(event.startTime);
              const date = dateLabel(
                event.startDate,
                locale,
                todayIso,
                tomorrowIso,
                relativeLabels,
              );
              const imageUrl = getEventImageUrl(event.image);
              const meta = [date, time].filter(Boolean).join(" · ");

              const rowClass = cn(
                "flex items-center gap-3 px-3 py-2.5 transition-colors",
                href && "hover:bg-accent/60 focus-visible:bg-accent/60",
              );

              const content = (
                <>
                  <div className="bg-muted relative h-24 w-32 shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      sizes="256px"
                      quality={90}
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      {meta}
                    </p>
                    <p className="text-foreground mt-0.5 line-clamp-2 text-sm leading-snug font-medium">
                      {title}
                    </p>
                  </div>
                </>
              );

              return (
                <li
                  key={event.id}
                  className="border-border/60 border-b last:border-b-0"
                >
                  {href ? (
                    <TrackedLink
                      eventKey="embed.event"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={rowClass}
                    >
                      {content}
                    </TrackedLink>
                  ) : (
                    <div className={rowClass}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-border/60 bg-background shrink-0 border-t p-3">
        <Button asChild className="w-full">
          <TrackedLink
            eventKey="embed.see_more"
            href={homeHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("seeMore")}
            <ArrowRight />
          </TrackedLink>
        </Button>
      </footer>
    </div>
  );
}
