import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages, getTranslations } from "next-intl/server";

import {
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  Ticket,
  Users,
} from "lucide-react";

import { EventTag } from "~/components/EventTag";
import {
  EventActionButtons,
  EventDetailRow,
  EventDetailScrollReset,
  EventHeroGallery,
  EventImagesGallery,
  EventMapAndReport,
  EventYoutubeEmbed,
  Typography,
} from "~/components/layout";
import { RelatedEventsRow } from "~/components/layout/RelatedEventsRow";
import { PartnerNearby } from "~/components/PartnerNearby";
import { Card, CardContent } from "~/components/ui/card";
import { ObfuscatedEmail } from "~/components/ui/obfuscated-email";
import type { Locale } from "~/constants";
import { localizedEventTagTitle } from "~/i18n/event-tag-label";
import { claimsApi, eventsApi, profilesApi, reportsApi } from "~/lib/api";
import {
  EVENT_DESCRIPTION_BODY_CLASSES,
  plainTextFromHtml,
  sanitizeEventDescription,
} from "~/lib/event-description-html";
import {
  buildGCalUrl,
  formatEventTitle,
  formatFullDate,
  formatTime,
  getEventImageUrl,
  isLiveNow,
} from "~/lib/event-utils";
import { isUsernameInvalid } from "~/lib/profile-username";
import { buildEventAlternates } from "~/lib/seo";
import {
  createSupabasePublicServerClient,
  createSupabaseServerClient,
} from "~/lib/supabase/server";
import type { Host } from "~/types";

/**
 * Fetch the event once per request and share the result between
 * generateMetadata and the page component via React's per-request cache.
 */
const getEventBySlugCached = cache((slug: string) =>
  eventsApi.getEventBySlug(createSupabasePublicServerClient(), slug),
);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

const openGraphLocaleByRouteLocale: Record<Locale, string> = {
  bg: "bg_BG",
  en: "en_US",
  ua: "uk_UA",
  ro: "ro_RO",
};

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
  const t = await getTranslations({ locale, namespace: "CreateEvent" });
  try {
    const event = await getEventBySlugCached(slug);
    if (!event) return { title: t("eventNotFound") };

    const formattedTitle = formatEventTitle(event.title);

    const rawDescription = plainTextFromHtml(
      sanitizeEventDescription(event.description ?? ""),
    );
    const description =
      (rawDescription.length > 160
        ? rawDescription.slice(0, 160).replace(/\s+\S*$/, "")
        : rawDescription) || formattedTitle;
    const imageUrl = getEventImageUrl(event.image);
    const absoluteImageUrl = imageUrl.startsWith("/")
      ? `${siteUrl}${imageUrl}`
      : imageUrl;
    const eventUrl = buildEventUrl(locale, slug);

    return {
      title: formattedTitle,
      description,
      alternates: buildEventAlternates(locale, slug),
      openGraph: {
        title: formattedTitle,
        description,
        url: eventUrl,
        siteName: "All4Ruse",
        images: absoluteImageUrl
          ? [{ url: absoluteImageUrl, width: 1200, height: 630, alt: formattedTitle }]
          : [],
        type: "article",
        locale: openGraphLocaleByRouteLocale[safeLocale],
        alternateLocale: Object.values(openGraphLocaleByRouteLocale).filter(
          (ogLocale) => ogLocale !== openGraphLocaleByRouteLocale[safeLocale],
        ),
      },
      twitter: {
        card: "summary_large_image",
        title: formattedTitle,
        description,
        images: absoluteImageUrl ? [absoluteImageUrl] : [],
      },
    };
  } catch {
    return { title: t("error") };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const safeLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "SingleEvent" });
  const tHome = await getTranslations({ locale, namespace: "HomePage" });
  const messages = await getMessages({ locale });
  const eventTagLabels = (messages as { EventTags?: Record<string, string> })
    .EventTags;

  const publicClient = createSupabasePublicServerClient();
  const authClient = await createSupabaseServerClient();

  const [event, { data: { user } }] = await Promise.all([
    getEventBySlugCached(slug),
    authClient.auth.getUser(),
  ]);
  if (!event) notFound();

  const adminUserId = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
  const isEventCreator = Boolean(user && event.createdBy === user.id);
  const isAdmin = Boolean(user && adminUserId && user.id === adminUserId);

  // Show claim button when the event was imported by the admin (no real owner yet)
  // and the logged-in user is not the admin themselves.
  const isAdminEvent = Boolean(adminUserId && event.createdBy === adminUserId);
  const showClaimButton =
    Boolean(user) && isAdminEvent && user?.id !== adminUserId;

  // Show report button for authenticated users who are not the event creator.
  const showReportButton =
    Boolean(user) && !isEventCreator && user?.id !== adminUserId;

  // Run all remaining independent fetches in parallel.
  const [hostProfileResult, relatedEvents, existingClaim, existingReport] =
    await Promise.all([
      event.createdBy && event.createdBy !== adminUserId
        ? profilesApi
            .getProfile(publicClient, event.createdBy)
            .then((r) => r.data)
        : Promise.resolve(null),
      eventsApi.getRelatedEvents(
        publicClient,
        event.id,
        (event.tags ?? []).map((tag) => tag.id),
        event.title,
      ),
      showClaimButton && user
        ? claimsApi
            .getMyClaimForEvent(authClient, event.id, user.id)
            .catch(() => null)
        : Promise.resolve(null),
      showReportButton && user
        ? reportsApi
            .getMyReportForEvent(authClient, event.id, user.id)
            .catch(() => null)
        : Promise.resolve(null),
    ]);

  const hostProfile = hostProfileResult;

  // Legacy profiles may have an email stored as their username.
  // When that happens, fall back to the user ID so the profile page can
  // still resolve the correct row (UUID lookup instead of username lookup).
  const hostProfileUsername = (() => {
    const u = hostProfile?.username;
    if (!u) return null;
    if (u.includes("@")) return hostProfile?.id ?? null;
    if (isUsernameInvalid(u)) return null;
    return u;
  })();

  const initialClaimStatus = existingClaim
    ? (existingClaim.status as import("~/lib/api").ClaimStatus)
    : null;

  const alreadyReported = Boolean(existingReport);

  const formattedTitle = formatEventTitle(event.title);
  const imageUrl = getEventImageUrl(event.image);
  const live = isLiveNow(event);
  const startTime = formatTime(event.startTime);
  const endTime = formatTime(event.endTime);
  const relativeDateLabels = {
    today: tHome("today"),
    tomorrow: tHome("tomorrow"),
  };
  const fullDate = formatFullDate(
    event.startDate,
    safeLocale,
    relativeDateLabels,
  );
  const isMultiDay = event.startDate !== event.endDate;
  const fullEndDate = isMultiDay
    ? formatFullDate(event.endDate, safeLocale, relativeDateLabels)
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
    plainTextFromHtml(sanitizeEventDescription(event.description ?? "")).slice(
      0,
      300,
    ) || formattedTitle;
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
            ...(event.lat != null && event.lng != null
              ? {
                  geo: {
                    "@type": "GeoCoordinates",
                    latitude: event.lat,
                    longitude: event.lng,
                  },
                }
              : {}),
          }
        : undefined,
    organizer: (() => {
      const namedHosts = hosts
        .filter((host): host is Required<Pick<Host, "name">> & Host =>
          Boolean(host.name),
        )
        .map((host) => ({
          "@type": "Organization" as const,
          name: host.name,
          url: host.link || undefined,
        }));
      if (namedHosts.length > 0) return namedHosts;
      return {
        "@type": "Organization" as const,
        name: "All4Ruse",
        url: "https://all4ruse.com",
      };
    })(),
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
        : {
            "@type": "Offer",
            price: "0",
            priceCurrency: "BGN",
            availability: "https://schema.org/InStock",
          },
  };

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapsQuery =
    event.lat != null && event.lng != null
      ? `${event.lat},${event.lng}`
      : [event.place, event.address, event.town].filter(Boolean).join(", ");
  const mapsEmbedUrl =
    mapsApiKey && mapsQuery
      ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(mapsQuery)}&zoom=15`
      : null;

  return (
    <>
      <EventDetailScrollReset />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="overflow-x-clip pb-20">
        {/* ── Hero — full bleed mobile, contained + rounded on desktop ── */}
        <EventHeroGallery
          imageUrl={imageUrl}
          eventId={String(event.id)}
          title={formattedTitle}
          live={live}
          liveLabel={t("liveNow")}
          cancelled={event.isEventCancelled ?? false}
          soldOut={event.isSoldOut ?? false}
          premium={event.isEventPremium ?? false}
          cancelledLabel={t("cancelled")}
          soldOutLabel={t("soldOut")}
          premiumLabel={t("premium")}
        />

        {/* ── Page body ─────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 pt-5 pb-4 sm:px-6 sm:pt-7 lg:px-8">
          {/* Title + tags */}
          <div className="mb-6 sm:mb-8">
            <h1 className="mb-3 text-center text-2xl font-bold tracking-tight wrap-break-word sm:text-3xl">
              {formattedTitle}
            </h1>
            {(event.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {event.tags!.map((tag) => (
                  <EventTag
                    key={tag.id}
                    title={tag.title ?? ""}
                    label={localizedEventTagTitle(
                      tag.title ?? "",
                      eventTagLabels,
                    )}
                    size="md"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Two-column on desktop: main content + sticky sidebar */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
            {/* ── Main / left column ──────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col gap-5 sm:gap-6">
              <Card>
                <CardContent className="p-4 sm:px-6 sm:pb-6">
                  {/* Info detail rows */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Date */}
                    <EventDetailRow
                      icon={<Calendar className="size-4" />}
                      label={t("date")}
                    >
                      <time
                        dateTime={event.startDate}
                        className="text-sm font-semibold"
                      >
                        {fullDate}
                      </time>
                      {fullEndDate && (
                        <time
                          dateTime={event.endDate}
                          className="text-muted-foreground text-sm"
                        >
                          → {fullEndDate}
                        </time>
                      )}
                    </EventDetailRow>

                    {/* Time */}
                    {startTime && (
                      <EventDetailRow
                        icon={<Clock className="size-4" />}
                        label={t("time")}
                      >
                        <time
                          dateTime={buildIsoDateTime(
                            event.startDate,
                            event.startTime,
                          )}
                          className="text-sm font-semibold"
                        >
                          {startTime}
                          {endTime ? ` – ${endTime}` : ""}
                        </time>
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
                        {event.address && event.address !== event.place && (
                          <p className="text-sm">{event.address}</p>
                        )}
                        {event.town && <p className="text-sm">{event.town}</p>}
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
                                rel="noopener"
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
                          <ObfuscatedEmail email={event.email} />
                        </a>
                      </EventDetailRow>
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="flex flex-col gap-3 lg:hidden">
                <EventActionButtons
                  locale={locale}
                  eventId={event.id}
                  ticketsLink={event.ticketsLink}
                  fbLink={event.fbLink}
                  gcalUrl={gcalUrl}
                  fbShareUrl={fbShareUrl}
                  isEventCreator={isEventCreator}
                  isAdmin={isAdmin}
                  hostProfileUsername={hostProfileUsername}
                  showClaimButton={showClaimButton}
                  initialClaimStatus={initialClaimStatus}
                />
              </div>

              {/* Description */}
              {(event.description || isAdminEvent) && (
                <Card>
                  <CardContent className="overflow-x-clip py-4">
                    {event.description && (
                      <article
                        className={EVENT_DESCRIPTION_BODY_CLASSES}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeEventDescription(event.description),
                        }}
                      />
                    )}
                    {isAdminEvent && (
                      <p
                        className={
                          event.description
                            ? "text-muted-foreground mt-4 border-t py-4 text-xs"
                            : "text-muted-foreground text-sm"
                        }
                      >
                        {t("adminEventSourceDisclaimer")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {event.youtubeUrl && (
                <EventYoutubeEmbed
                  youtubeUrl={event.youtubeUrl}
                  title={t("youtubeVideo")}
                />
              )}

              {/* ── Mobile-only: map + report after description ─────────── */}
              <div className="flex flex-col gap-3 lg:hidden">
                <EventMapAndReport
                  locale={locale}
                  mapsEmbedUrl={mapsEmbedUrl}
                  eventId={event.id}
                  showReportButton={showReportButton}
                  alreadyReported={alreadyReported}
                />
              </div>

              {/* Mobile: below the map. Desktop: below the description, full
                  width (the map lives in the sidebar there). */}
              <PartnerNearby
                eventSlug={event.slug}
                eventLat={event.lat}
                eventLng={event.lng}
                eventPlace={event.place ?? event.address}
                mapsApiKey={mapsApiKey}
              />

              {/* Image gallery — skip when only one image (hero already covers it) */}
              {galleryImages.length > 1 && (
                <Card>
                  <CardContent className="p-4 sm:px-6 sm:pb-6">
                    <Typography.H2>{t("gallery")}</Typography.H2>
                    <EventImagesGallery images={galleryImages} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Desktop sidebar (hidden on mobile) ──────────────────── */}
            <div className="hidden lg:sticky lg:top-20 lg:flex lg:w-52 lg:shrink-0 lg:flex-col lg:gap-3">
              <EventActionButtons
                locale={locale}
                eventId={event.id}
                ticketsLink={event.ticketsLink}
                fbLink={event.fbLink}
                gcalUrl={gcalUrl}
                fbShareUrl={fbShareUrl}
                isEventCreator={isEventCreator}
                isAdmin={isAdmin}
                hostProfileUsername={hostProfileUsername}
                showClaimButton={showClaimButton}
                initialClaimStatus={initialClaimStatus}
              />
              <EventMapAndReport
                locale={locale}
                mapsEmbedUrl={mapsEmbedUrl}
                eventId={event.id}
                showReportButton={showReportButton}
                alreadyReported={alreadyReported}
                mapHeight={200}
                mapRounded="lg"
              />
            </div>
          </div>

          {/* ── Related events — horizontal scroll row ──────────────────── */}
          <RelatedEventsRow events={relatedEvents} heading={t("moreEvents")} />
        </div>
      </div>
    </>
  );
}
