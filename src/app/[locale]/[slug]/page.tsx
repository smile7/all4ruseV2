import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages, getTranslations } from "next-intl/server";

import {
  Calendar,
  CalendarPlus,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Share2,
  Ticket,
  User,
  Users,
} from "lucide-react";

import { ClaimEventButton } from "~/components/ClaimEvent/ClaimEventButton";
import { EventCard, EventSaveButton } from "~/components/EventCard";
import { EventTag } from "~/components/EventTag";
import {
  EventDetailRow,
  EventDetailScrollReset,
  EventHeroGallery,
  EventImagesGallery,
  EventYoutubeEmbed,
  Typography,
} from "~/components/layout";
import { ReportEventButton } from "~/components/ReportEvent/ReportEventButton";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ObfuscatedEmail } from "~/components/ui/obfuscated-email";
import { type Locale, LOCALES } from "~/constants";
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
import {
  createSupabasePublicServerClient,
  createSupabaseServerClient,
} from "~/lib/supabase/server";
import type { Host } from "~/types";

export const dynamic = "force-dynamic";

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
    const client = createSupabasePublicServerClient();
    const event = await eventsApi.getEventBySlug(client, slug);
    if (!event) return { title: t("eventNotFound") };

    const formattedTitle = formatEventTitle(event.title);

    const description =
      plainTextFromHtml(sanitizeEventDescription(event.description ?? "")).slice(
        0,
        160,
      ) || formattedTitle;
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
        type: "article",
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

  const [authClient, publicClient] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabasePublicServerClient()),
  ]);
  const [event, { data: { user } }] = await Promise.all([
    eventsApi.getEventBySlug(publicClient, slug),
    authClient.auth.getUser(),
  ]);
  if (!event) notFound();

  const adminUserId = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
  const hostProfile =
    event.createdBy && event.createdBy !== adminUserId
      ? await profilesApi.getProfile(publicClient, event.createdBy).then((r) => r.data)
      : null;

  const isEventCreator = Boolean(user && event.createdBy === user.id);

  // Show claim button when the event was imported by the admin (no real owner yet)
  // and the logged-in user is not the admin themselves.
  const showClaimButton =
    Boolean(user) &&
    event.createdBy === adminUserId &&
    user?.id !== adminUserId;

  const existingClaim =
    showClaimButton && user
      ? await claimsApi
          .getMyClaimForEvent(authClient, event.id, user.id)
          .catch(() => null)
      : null;

  const initialClaimStatus = existingClaim
    ? (existingClaim.status as import("~/lib/api").ClaimStatus)
    : null;

  // Show report button for authenticated users who are not the event creator.
  const showReportButton = Boolean(user) && !isEventCreator && user?.id !== adminUserId;

  const existingReport =
    showReportButton && user
      ? await reportsApi
          .getMyReportForEvent(authClient, event.id, user.id)
          .catch(() => null)
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
  const relatedEvents = await eventsApi.getRelatedEvents(
    publicClient,
    event.id,
    (event.tags ?? []).map((tag) => tag.id),
  );

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
            <h1 className="mb-3 text-center text-2xl font-bold tracking-tight sm:text-3xl wrap-break-word">
              {formattedTitle}
            </h1>
            {(event.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {event.tags!.map((tag) => (
                  <EventTag
                    key={tag.id}
                    title={tag.title ?? ""}
                    label={localizedEventTagTitle(tag.title ?? "", eventTagLabels)}
                    size="md"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Two-column on desktop: main content + sticky sidebar */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">

            {/* ── Main / left column ──────────────────────────────────── */}
            <div className="min-w-0 flex-1 flex flex-col gap-5 sm:gap-6">

            <Card>
              <CardContent className="p-4 sm:px-6 sm:pb-6">
              {/* Info detail rows */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Date */}
                <EventDetailRow icon={<Calendar className="size-4" />} label={t("date")}>
                  <p className="text-sm font-semibold capitalize">{fullDate}</p>
                  {fullEndDate && (
                    <p className="text-muted-foreground text-sm">→ {fullEndDate}</p>
                  )}
                </EventDetailRow>

                {/* Time */}
                {startTime && (
                  <EventDetailRow icon={<Clock className="size-4" />} label={t("time")}>
                    <p className="text-sm font-semibold">
                      {startTime}{endTime ? ` – ${endTime}` : ""}
                    </p>
                  </EventDetailRow>
                )}

                {/* Location */}
                {(event.address || event.town || event.place) && (
                  <EventDetailRow icon={<MapPin className="size-4" />} label={t("place")}>
                    {event.place && <p className="text-sm font-semibold">{event.place}</p>}
                    {event.address && <p className="text-sm">{event.address}</p>}
                    {event.town && <p className="text-sm">{event.town}</p>}
                  </EventDetailRow>
                )}

                {/* Price */}
                {event.price !== null && event.price !== undefined && event.price !== "" && (
                  <EventDetailRow icon={<Ticket className="size-4" />} label={t("price")}>
                    <p className="text-sm font-semibold">
                      {event.price === "0" || event.price === "0.00"
                        ? t("free")
                        : `${event.price} ${t("euros")}`}
                    </p>
                  </EventDetailRow>
                )}

                {/* Hosts */}
                {hosts.length > 0 && (
                  <EventDetailRow icon={<Users className="size-4" />} label={t("hosts")}>
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
                          <p key={i} className="text-sm font-semibold">{o.name}</p>
                        ),
                      )}
                    </div>
                  </EventDetailRow>
                )}

                {/* Phone */}
                {event.phoneNumber && (
                  <EventDetailRow icon={<Phone className="size-4" />} label={t("contactPhone")}>
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
                  <EventDetailRow icon={<Mail className="size-4" />} label={t("email")}>
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
                {isEventCreator && (
                  <Button variant="outline" asChild className="w-full justify-start gap-2">
                    <a href={`/${locale}/create-event?editId=${event.id}`}>
                      <Pencil className="size-4 shrink-0" />
                      {t("editEvent")}
                    </a>
                  </Button>
                )}
                {event.ticketsLink && (
                  <Button variant="secondary" asChild className="w-full justify-start gap-2">
                    <a href={event.ticketsLink} target="_blank" rel="noopener">
                      <Ticket className="size-4 shrink-0" />
                      {t("buyTickets")}
                    </a>
                  </Button>
                )}
                {event.fbLink && (
                  <Button variant="secondary" asChild className="w-full justify-start gap-2">
                    <a href={event.fbLink} target="_blank" rel="noopener">
                      <ExternalLink className="size-4 shrink-0" />
                      {t("facebook")}
                    </a>
                  </Button>
                )}
                <EventSaveButton eventId={event.id} variant="button" />
                <Button variant="secondary" asChild className="w-full justify-start gap-2">
                  <a href={gcalUrl} target="_blank" rel="noopener">
                    <CalendarPlus className="size-4 shrink-0" />
                    {t("addToCalendar")}
                  </a>
                </Button>
                {hostProfile?.username && (
                  <Button variant="secondary" asChild className="w-full justify-start gap-2">
                    <a href={`/${locale}/user/${hostProfile.username}`}>
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
                    eventId={event.id}
                    initialClaimStatus={initialClaimStatus}
                  />
                )}
                {showReportButton && (
                  <ReportEventButton
                    eventId={event.id}
                    alreadyReported={alreadyReported}
                  />
                )}
              </div>

              {/* Description */}
              {event.description && (
                <Card>
                  <CardContent className="overflow-x-clip py-4">
                    <div
                      className={EVENT_DESCRIPTION_BODY_CLASSES}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeEventDescription(event.description),
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {event.youtubeUrl && (
                <EventYoutubeEmbed
                  youtubeUrl={event.youtubeUrl}
                  title={t("youtubeVideo")}
                />
              )}

              {/* ── Mobile-only: map after description ───────────────────── */}
              {mapsEmbedUrl && (
                <div className="overflow-hidden rounded-xl border lg:hidden">
                  <iframe
                    src={mapsEmbedUrl}
                    title={t("place")}
                    width="100%"
                    height="180"
                    className="block"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              {/* Image gallery — skip when only one image (hero already covers it) */}
              {galleryImages.length > 1 && (
                <Card>
                  <CardContent className="p-4 sm:px-6 sm:pb-6">
                    <Typography.H2>
                      {t("gallery")}
                    </Typography.H2>
                    <EventImagesGallery images={galleryImages} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Desktop sidebar (hidden on mobile) ──────────────────── */}
            <div className="hidden lg:sticky lg:top-20 lg:flex lg:w-52 lg:shrink-0 lg:flex-col lg:gap-3">
              {isEventCreator && (
                <Button variant="outline" asChild className="w-full justify-start gap-2">
                  <a href={`/${locale}/create-event?editId=${event.id}`}>
                    <Pencil className="size-4 shrink-0" />
                    {t("editEvent")}
                  </a>
                </Button>
              )}
              {event.ticketsLink && (
                <Button variant="secondary" asChild className="w-full justify-start gap-2">
                  <a href={event.ticketsLink} target="_blank" rel="noopener">
                    <Ticket className="size-4 shrink-0" />
                    {t("buyTickets")}
                  </a>
                </Button>
              )}
              {event.fbLink && (
                <Button variant="secondary" asChild className="w-full justify-start gap-2">
                  <a href={event.fbLink} target="_blank" rel="noopener">
                    <ExternalLink className="size-4 shrink-0" />
                    {t("facebook")}
                  </a>
                </Button>
              )}
              <EventSaveButton eventId={event.id} variant="button" />
              <Button variant="secondary" asChild className="w-full justify-start gap-2">
                <a href={gcalUrl} target="_blank" rel="noopener">
                  <CalendarPlus className="size-4 shrink-0" />
                  {t("addToCalendar")}
                </a>
              </Button>
              {hostProfile?.username && (
                <Button variant="secondary" asChild className="w-full justify-start gap-2">
                  <a href={`/${locale}/user/${hostProfile.username}`}>
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
                  eventId={event.id}
                  initialClaimStatus={initialClaimStatus}
                />
              )}
              {showReportButton && (
                <ReportEventButton
                  eventId={event.id}
                  alreadyReported={alreadyReported}
                />
              )}
              {mapsEmbedUrl && (
                <div className="mt-1 overflow-hidden rounded-lg border">
                  <iframe
                    src={mapsEmbedUrl}
                    title={t("place")}
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

          {/* ── Related events — horizontal scroll row ──────────────────── */}
          {relatedEvents.length > 0 && (
            <div className="mt-8 flex flex-col gap-4">
              <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {t("moreEvents")}
              </h3>
              <div className="-mx-4 sm:-mx-6 lg:mx-0">
                <div className="flex gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-6 lg:px-0 [&::-webkit-scrollbar]:hidden">
                  {relatedEvents.map((relatedEvent) => (
                    <div key={relatedEvent.id} className="w-64 shrink-0 sm:w-72">
                      <EventCard event={relatedEvent} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
