import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Building2, ExternalLink, Mail, MapPin, Phone } from "lucide-react";

import { EventCard } from "~/components/EventCard/EventCard";
import { DEFAULT_LOCALE, DEFAULT_PROFILE_COLOR, OG_IMAGE } from "~/constants";
import { eventsApi, hostsApi } from "~/lib/api";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "~/lib/article-jsonld";
import { buildEventCollectionJsonLd } from "~/lib/event-jsonld";
import {
  formatCalendarDate,
  formatEventTitle,
  getEventImageUrl,
} from "~/lib/event-utils";
import {
  buildHostOrganizationJsonLd,
  hostCanonicalUrl,
} from "~/lib/host-jsonld";
import { buildHostAlternates, jsonLdImages, truncateForMeta } from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";
import type { Event } from "~/types";

import { ProfileSectionHeader } from "../../user/[username]/ProfileSectionHeader";
import { RevealOnScroll } from "../../user/[username]/RevealOnScroll";

export const revalidate = 86400;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

const COLOR = DEFAULT_PROFILE_COLOR;

/** How many upcoming events are named in the meta description. */
const META_EVENT_COUNT = 3;

/** Shared between generateMetadata and the page via React's per-request cache. */
const getHostPageData = cache(async (slug: string) => {
  const client = createSupabasePublicServerClient();
  const host = await hostsApi.getHostBySlug(client, slug);
  if (!host) return null;
  const upcoming = await eventsApi.getHostUpcomingEvents(client, host.id);
  return { host, upcoming };
});

function hexRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

/** Naming the next events makes the snippet specific and visibly fresh. */
function eventsSummary(events: Event[], locale: string): string {
  return events
    .slice(0, META_EVENT_COUNT)
    .map(
      (event) =>
        `${formatEventTitle(event.title)} (${formatCalendarDate(event.startDate, locale)})`,
    )
    .join(", ");
}

function eventsWithSlug(events: Event[]) {
  return events.filter(
    (event): event is Event & { slug: string } =>
      typeof event.slug === "string" && event.slug.length > 0,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const data = await getHostPageData(slug);
  if (!data) return {};

  const { host, upcoming } = data;
  const t = await getTranslations({ locale, namespace: "Hosts" });
  // Same rule as event titles: keep the city in the SERP without repeating it.
  const title = /русе|ruse/i.test(host.name)
    ? t("pageTitleNoCity", { name: host.name })
    : t("pageTitle", { name: host.name });
  const description = truncateForMeta(
    upcoming.length > 0
      ? t("pageDescription", {
          name: host.name,
          count: upcoming.length,
          events: eventsSummary(upcoming, locale),
        })
      : t("pageDescriptionEmpty", { name: host.name }),
  );
  const alternates = buildHostAlternates(host.slug);
  // The next event's poster beats the generic brand card in social previews.
  const nextPoster = upcoming[0]?.image;
  const images = nextPoster
    ? jsonLdImages(getEventImageUrl(nextPoster)).map((url) => ({ url }))
    : [OG_IMAGE];

  return {
    // The root layout's title template appends "| All4Ruse"; Open Graph does not.
    title,
    description,
    alternates,
    // The page only lists upcoming events, so without any it is a thin shell.
    robots: upcoming.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${title} | All4Ruse`,
      description,
      url: alternates.canonical,
      siteName: "All4Ruse",
      images,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | All4Ruse`,
      description,
      images: images.map((image) => image.url),
    },
  };
}

export default async function HostPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const data = await getHostPageData(slug);
  if (!data) notFound();

  const { host, upcoming } = data;
  const [t, tHosts] = await Promise.all([
    getTranslations({ locale, namespace: "PublicProfile" }),
    getTranslations({ locale, namespace: "Hosts" }),
  ]);
  const rgb = hexRgb(COLOR);
  const canonicalUrl = hostCanonicalUrl(host.slug);
  const eventsHeading = tHosts("eventsHeading", { name: host.name });

  const organizationJsonLd = buildHostOrganizationJsonLd(host);
  const linkedEvents = eventsWithSlug(upcoming);
  const collectionJsonLd =
    linkedEvents.length > 0
      ? buildEventCollectionJsonLd({
          url: canonicalUrl,
          name: eventsHeading,
          description: tHosts("pageDescription", {
            name: host.name,
            count: upcoming.length,
            events: eventsSummary(upcoming, locale),
          }),
          items: linkedEvents.map((event) => ({
            name: formatEventTitle(event.title),
            url: `${SITE_URL}/${DEFAULT_LOCALE}/${event.slug}`,
          })),
        })
      : null;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    {
      name: tHosts("breadcrumbHome"),
      url: `${SITE_URL}/${DEFAULT_LOCALE}`,
    },
    { name: host.name, url: canonicalUrl },
  ]);

  return (
    <>
      {[organizationJsonLd, collectionJsonLd, breadcrumbJsonLd].map(
        (jsonLd, index) =>
          jsonLd && (
            <script
              key={index}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
            />
          ),
      )}

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative left-1/2 flex w-screen max-w-[100vw] -translate-x-1/2 flex-col items-center justify-center overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 z-0">
          <Image
            src="/newspapers.jpg"
            alt=""
            fill
            priority
            className="object-cover"
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/85" />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `linear-gradient(135deg, rgba(${rgb},0.25) 0%, transparent 50%, rgba(0,0,0,0.35) 100%)`,
            }}
          />
          <div className="from-background absolute inset-x-0 bottom-0 h-32 bg-linear-to-t to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center sm:px-8">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl md:text-7xl">
            {host.name}
          </h1>

          {(host.address || host.place) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-base font-medium text-white/80 sm:text-xl">
              {host.place && (
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="size-5 shrink-0" aria-hidden />
                  {host.place}
                </div>
              )}
              {host.address && host.place && (
                <span className="hidden text-white/40 sm:inline" aria-hidden>
                  ·
                </span>
              )}
              {host.address && (
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="size-5 shrink-0" aria-hidden />
                  {host.address}
                </div>
              )}
            </div>
          )}

          {upcoming.length > 0 && (
            <p className="mt-6 max-w-2xl text-base text-white/75 sm:text-lg">
              {tHosts("intro", { name: host.name, count: upcoming.length })}
            </p>
          )}

          {host.website && (
            <a
              href={host.website}
              target="_blank"
              rel="noopener"
              className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:mt-10 sm:px-8 sm:py-3.5 sm:text-base"
              style={{ backgroundColor: COLOR }}
            >
              {t("visitWebsite")}
              <ExternalLink className="size-4 sm:size-5" aria-hidden />
            </a>
          )}
        </div>
      </section>

      {/* ── UPCOMING EVENTS ───────────────────────────────────────────────── */}
      <section className="group/section mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-8 sm:pt-16 sm:pb-24">
        <RevealOnScroll>
          <ProfileSectionHeader title={eventsHeading} color={COLOR} />
        </RevealOnScroll>

        {upcoming.length === 0 ? (
          <div className="border-border bg-secondary/10 flex min-h-[200px] flex-col items-center justify-center rounded-4xl border-2 border-dashed p-12 text-center">
            <p className="text-muted-foreground text-xl font-medium sm:text-2xl">
              {t("noUpcomingEvents")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {upcoming.map((event, i) => (
              <RevealOnScroll key={event.id} delay={i * 80} from="scale">
                <EventCard event={event} />
              </RevealOnScroll>
            ))}
          </div>
        )}
      </section>

      {/* ── CONTACT ───────────────────────────────────────────────────────── */}
      {(host.phone || host.email || host.address) && (
        <section className="group/section relative overflow-hidden pt-8 pb-32">
          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 sm:px-8">
            <RevealOnScroll>
              <ProfileSectionHeader title={t("contactInfo")} color={COLOR} />
            </RevealOnScroll>
            <div className="flex w-full max-w-4xl flex-col justify-center gap-6 sm:flex-row sm:gap-8">
              {host.phone && (
                <ContactCard
                  href={`tel:${host.phone}`}
                  icon={<Phone className="size-6" />}
                  label={t("contactPhone")}
                  value={host.phone}
                  rgb={rgb}
                />
              )}
              {host.email && (
                <ContactCard
                  href={`mailto:${host.email}`}
                  icon={<Mail className="size-6" />}
                  label={t("contactEmail")}
                  value={host.email}
                  rgb={rgb}
                />
              )}
              {host.address && (
                <ContactCard
                  icon={<MapPin className="size-6" />}
                  label={t("contactLocation")}
                  value={host.address}
                  rgb={rgb}
                />
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function ContactCard({
  href,
  icon,
  label,
  value,
  rgb,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  rgb: string;
}) {
  const className =
    "group/card bg-background/95 flex h-full min-w-0 flex-col items-center gap-4 rounded-3xl border p-8 text-center shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl";
  const content = (
    <>
      <div
        className="flex size-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover/card:scale-110"
        style={{ backgroundColor: `rgba(${rgb},0.12)`, color: COLOR }}
        aria-hidden
      >
        {icon}
      </div>
      <div className="w-full min-w-0">
        <div className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
          {label}
        </div>
        <div className="mt-1 text-sm font-medium break-all sm:text-base">
          {value}
        </div>
      </div>
    </>
  );

  return (
    <RevealOnScroll from="scale" className="min-w-0 sm:flex-1">
      {href ? (
        <a href={href} className={className}>
          {content}
        </a>
      ) : (
        <div className={className}>{content}</div>
      )}
    </RevealOnScroll>
  );
}
