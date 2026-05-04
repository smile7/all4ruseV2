import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  Bookmark,
  Calendar,
  CalendarPlus,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Share2,
  Ticket,
  Users,
} from "lucide-react";

import {
  EventDetailRow,
  EventHeroGallery,
  EventImagesGallery,
  Typography,
} from "~/components/layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { type Locale, LOCALES } from "~/constants";
import { eventsApi } from "~/lib/api";
import {
  buildGCalUrl,
  formatEventTitle,
  formatFullDate,
  formatTime,
  getEventImageUrl,
  getTagLabel,
  isLiveNow,
} from "~/lib/event-utils";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";
import type { Host } from "~/types";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

const openGraphLocaleByRouteLocale: Record<Locale, string> = {
  bg: "bg_BG",
  en: "en_US",
  ua: "uk_UA",
  ro: "ro_RO",
};

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildEventPath(locale: string, slug: string) {
  return `/${locale}/${slug}`;
}

function buildEventUrl(locale: string, slug: string) {
  return `${siteUrl}${buildEventPath(locale, slug)}`;
}

function normalizeTime(time: string | null | undefined) {
  if (!time) return null;
  return time.slice(0, 5);
}

function buildIsoDateTime(date: string, time: string | null | undefined) {
  const normalizedTime = normalizeTime(time);
  return normalizedTime ? `${date}T${normalizedTime}` : date;
}

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const safeLocale = locale as Locale;
  try {
    const client = createSupabasePublicServerClient();
    const event = await eventsApi.getEventBySlug(client, slug);
    if (!event) return { title: "Събитието не е намерено" };

    const formattedTitle = formatEventTitle(event.title);

    const description =
      stripHtml(event.description ?? "").slice(0, 160) || formattedTitle;
    const imageUrl = getEventImageUrl(event.image);
    const eventPath = buildEventPath(locale, slug);
    const eventUrl = buildEventUrl(locale, slug);

    return {
      title: formattedTitle,
      description,
      alternates: {
        canonical: eventPath,
        languages: Object.fromEntries(
          LOCALES.map((language) => [language, buildEventPath(language, slug)]),
        ),
      },
      openGraph: {
        title: formattedTitle,
        description,
        url: eventUrl,
        siteName: "All4Ruse",
        images: imageUrl ? [{ url: imageUrl }] : [],
        type: "website",
        locale: openGraphLocaleByRouteLocale[safeLocale],
        alternateLocale: LOCALES.filter(
          (language) => language !== safeLocale,
        ).map((language) => openGraphLocaleByRouteLocale[language]),
      },
      twitter: {
        card: "summary_large_image",
        title: formattedTitle,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch {
    return { title: "Събитие" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const safeLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "SingleEvent" });

  const client = createSupabasePublicServerClient();
  const event = await eventsApi.getEventBySlug(client, slug);
  if (!event) notFound();

  const formattedTitle = formatEventTitle(event.title);
  const imageUrl = getEventImageUrl(event.image);
  const live = isLiveNow(event.startDate, event.endDate);
  const startTime = formatTime(event.startTime);
  const endTime = formatTime(event.endTime);
  const fullDate = formatFullDate(event.startDate, safeLocale);
  const isMultiDay = event.startDate !== event.endDate;
  const fullEndDate = isMultiDay
    ? formatFullDate(event.endDate, safeLocale)
    : null;

  const hosts = (
    Array.isArray(event.organizers) ? event.organizers : []
  ) as Host[];

  const galleryImages = Array.isArray(event.images)
    ? (event.images as unknown[])
        .filter((img): img is string => typeof img === "string")
        .map(getEventImageUrl)
    : [];

  const eventUrl = buildEventUrl(locale, slug);
  const gcalUrl = buildGCalUrl(event);
  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`;
  const descriptionText =
    stripHtml(event.description ?? "").slice(0, 300) || formattedTitle;
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: formattedTitle,
    description: descriptionText,
    url: eventUrl,
    image: imageUrl ? [imageUrl] : undefined,
    startDate: buildIsoDateTime(event.startDate, event.startTime),
    endDate: buildIsoDateTime(event.endDate, event.endTime ?? event.startTime),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: event.isEventCancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    inLanguage: locale,
    location:
      event.place || event.address || event.town
        ? {
            "@type": "Place",
            name: event.place ?? event.town ?? event.address,
            address: {
              "@type": "PostalAddress",
              streetAddress: event.address || undefined,
              addressLocality: event.town || undefined,
              addressCountry: "BG",
            },
          }
        : undefined,
    organizer:
      hosts.length > 0
        ? hosts
            .filter((host): host is Required<Pick<Host, "name">> & Host =>
              Boolean(host.name),
            )
            .map((host) => ({
              "@type": "Organization",
              name: host.name,
              url: host.link || undefined,
            }))
        : undefined,
    offers:
      event.price !== null && event.price !== undefined && event.price !== ""
        ? {
            "@type": "Offer",
            url: event.ticketsLink || eventUrl,
            price:
              event.price === "0" || event.price === "0.00" ? "0" : event.price,
            priceCurrency: "EUR",
            availability: event.isSoldOut
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
          }
        : undefined,
  };

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapsQuery = [event.place, event.address, event.town]
    .filter(Boolean)
    .join(", ");
  const mapsEmbedUrl =
    mapsApiKey && mapsQuery
      ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(mapsQuery)}&zoom=15`
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="overflow-x-clip pb-12">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <EventHeroGallery
          imageUrl={imageUrl}
          eventId={String(event.id)}
          title={formattedTitle}
          live={live}
          cancelled={event.isEventCancelled ?? false}
          soldOut={event.isSoldOut ?? false}
          premium={event.isEventPremium ?? false}
          cancelledLabel={t("cancelled")}
          soldOutLabel={t("soldOut")}
          premiumLabel={t("premium")}
        />

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Typography.H1 className="mt-10 mb-5 text-center">
            {formattedTitle}
          </Typography.H1>

          {(event.tags?.length ?? 0) > 0 && (
            <div className="mb-12 flex flex-wrap justify-center gap-2">
              {event.tags!.map((tag) => (
                <span
                  key={tag.id}
                  className="bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide uppercase"
                >
                  #{getTagLabel(tag.title, safeLocale)}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 lg:flex lg:items-start lg:gap-12">
            {/* ── Left column ───────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Date */}
                <EventDetailRow
                  icon={<Calendar className="size-4" />}
                  label={t("date")}
                >
                  <p className="text-sm font-semibold capitalize">{fullDate}</p>
                  {fullEndDate && (
                    <p className="text-muted-foreground text-sm">
                      → {fullEndDate}
                    </p>
                  )}
                </EventDetailRow>

                {/* Time */}
                {startTime && (
                  <EventDetailRow
                    icon={<Clock className="size-4" />}
                    label={t("time")}
                  >
                    <p className="text-sm font-semibold">
                      {startTime}
                      {endTime ? ` – ${endTime}` : ""}
                    </p>
                  </EventDetailRow>
                )}

                {/* Location */}
                {(event.address || event.town || event.place) && (
                  <EventDetailRow
                    icon={<MapPin className="size-4" />}
                    label={t("place")}
                  >
                    {event.place && (
                      <p className="text-sm font-semibold">{event.place}</p>
                    )}
                    {event.address && (
                      <p className="text-foreground text-sm">{event.address}</p>
                    )}
                    {event.town && (
                      <p className="text-foreground text-sm">{event.town}</p>
                    )}
                  </EventDetailRow>
                )}

                {/* Price */}
                {event.price !== null &&
                  event.price !== undefined &&
                  event.price !== "" && (
                    <EventDetailRow
                      icon={<Ticket className="size-4" />}
                      label={t("price")}
                    >
                      <p className="text-sm font-semibold">
                        {event.price === "0" || event.price === "0.00"
                          ? t("free")
                          : `${event.price} ${t("euros")}`}
                      </p>
                    </EventDetailRow>
                  )}

                {/* Hosts */}
                {hosts.length > 0 && (
                  <EventDetailRow
                    icon={<Users className="size-4" />}
                    label={t("hosts")}
                  >
                    <div className="flex flex-col gap-0.5">
                      {hosts.map((o, i) =>
                        o.link ? (
                          <a
                            key={i}
                            href={o.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold underline-offset-2 hover:underline"
                          >
                            {o.name}
                          </a>
                        ) : (
                          <p key={i} className="text-sm font-semibold">
                            {o.name}
                          </p>
                        ),
                      )}
                    </div>
                  </EventDetailRow>
                )}

                {/* Phone */}
                {event.phoneNumber && (
                  <EventDetailRow
                    icon={<Phone className="size-4" />}
                    label={t("contactPhone")}
                  >
                    <a
                      href={`tel:${event.phoneNumber}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {event.phoneNumber}
                    </a>
                  </EventDetailRow>
                )}

                {/* Email */}
                {event.email && (
                  <EventDetailRow
                    icon={<Mail className="size-4" />}
                    label={t("email")}
                  >
                    <a
                      href={`mailto:${event.email}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {event.email}
                    </a>
                  </EventDetailRow>
                )}
              </div>

              {/* Description card */}
              {event.description && (
                <Card>
                  <CardContent className="overflow-x-clip p-6">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none wrap-break-word [&_iframe]:w-full [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_video]:h-auto [&_video]:max-w-full"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Gallery card */}
              {galleryImages.length > 0 && (
                <Card>
                  <CardContent className="px-6 pt-0 pb-6">
                    <EventImagesGallery images={galleryImages} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Actions sidebar ────────────────────────────────────────── */}
            {/*
              Desktop: sticky sidebar to the right of meta.
              Mobile:  stacked below meta, before description.
              top value accounts for sticky header height (~56px mobile / ~64px desktop).
            */}
            <div className="mt-6 flex flex-col gap-2 lg:sticky lg:top-20 lg:mt-0 lg:w-52 lg:shrink-0">
              {event.ticketsLink && (
                <Button
                  variant="outline"
                  asChild
                  className="w-full justify-center gap-2"
                >
                  <a
                    href={event.ticketsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Ticket className="size-4 shrink-0" />
                    {t("buyTickets")}
                  </a>
                </Button>
              )}
              {event.fbLink && (
                <Button
                  variant="outline"
                  asChild
                  className="w-full justify-center gap-2"
                >
                  <a
                    href={event.fbLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4 shrink-0" />
                    {t("facebook")}
                  </a>
                </Button>
              )}

              <Button variant="outline" className="w-full justify-center gap-2">
                <Bookmark className="size-4 shrink-0" />
                {t("save")}
              </Button>

              <Button
                variant="outline"
                asChild
                className="w-full justify-center gap-2"
              >
                <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
                  <CalendarPlus className="size-4 shrink-0" />
                  {t("addToCalendar")}
                </a>
              </Button>

              <Button asChild className="w-full justify-center gap-2">
                <a href={fbShareUrl} target="_blank" rel="noopener noreferrer">
                  <Share2 className="size-4 shrink-0" />
                  {t("shareOnFacebook")}
                </a>
              </Button>

              {mapsEmbedUrl && (
                <div className="mt-2 overflow-hidden rounded-lg border">
                  <iframe
                    src={mapsEmbedUrl}
                    title="Event location"
                    width="100%"
                    height="200"
                    className="block"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
