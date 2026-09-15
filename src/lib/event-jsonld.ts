import { FALLBACK_IMAGE } from "~/constants";
import { normalizeEventTagKey } from "~/lib/event-tag-styles";
import { toSofiaIsoDateTime } from "~/lib/event-utils";
import type { Host } from "~/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

const LOCALE_TO_BCP47: Record<string, string> = {
  bg: "bg-BG",
  en: "en-US",
  ua: "uk-UA",
  ro: "ro-RO",
};

type SchemaEventType =
  | "Event"
  | "TheaterEvent"
  | "MusicEvent"
  | "ScreeningEvent"
  | "SportsEvent";

const EVENT_TYPE_BY_TAG: Record<string, SchemaEventType> = {
  THEATRE: "TheaterEvent",
  PUPPETTHEATRE: "TheaterEvent",
  OPERA: "TheaterEvent",
  COMEDY: "TheaterEvent",
  CONCERT: "MusicEvent",
  MUSIC: "MusicEvent",
  MARCHMUSICALDAYS: "MusicEvent",
  CINEMA: "ScreeningEvent",
  SPORTS: "SportsEvent",
};

export type ParsedEventPrice = {
  kind: "free" | "single" | "range";
  low: number;
  high: number;
};

export type EventJsonLdInput = {
  name: string;
  description: string;
  url: string;
  imageUrl: string | null;
  galleryUrls?: string[];
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  place: string | null;
  address: string | null;
  town: string | null;
  lat: number | null;
  lng: number | null;
  locale: string;
  isCancelled: boolean;
  isSoldOut: boolean;
  price: string | null;
  ticketsLink: string | null;
  tags: { title: string | null }[] | null | undefined;
  hosts: Host[];
};

/**
 * Google Event `Offer.price` must be a number. Imported Grabо prices like
 * `"8–15"` fail Rich Results and can disqualify the whole Event markup.
 */
export function parseEventOfferPrice(
  price: string | null | undefined,
): ParsedEventPrice | null {
  if (price == null) return null;
  const trimmed = price.trim();
  if (!trimmed) return null;

  const range = /(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)/.exec(trimmed);
  if (range?.[1] && range[2]) {
    const low = Number(range[1].replace(",", "."));
    const high = Number(range[2].replace(",", "."));
    if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
    const min = Math.min(low, high);
    const max = Math.max(low, high);
    if (min === 0 && max === 0) return { kind: "free", low: 0, high: 0 };
    return min === max
      ? { kind: "single", low: min, high: max }
      : { kind: "range", low: min, high: max };
  }

  const single = /(\d+(?:[.,]\d+)?)/.exec(trimmed);
  if (!single?.[1]) return null;
  const value = Number(single[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;
  if (value === 0) return { kind: "free", low: 0, high: 0 };
  return { kind: "single", low: value, high: value };
}

function schemaEventType(tags: EventJsonLdInput["tags"]): SchemaEventType {
  for (const tag of tags ?? []) {
    const mapped = EVENT_TYPE_BY_TAG[normalizeEventTagKey(tag.title)];
    if (mapped) return mapped;
  }
  return "Event";
}

function absoluteEventImage(imageUrl: string | null): string | undefined {
  if (!imageUrl || imageUrl === FALLBACK_IMAGE) return undefined;
  if (imageUrl.startsWith("/")) return `${SITE_URL}${imageUrl}`;
  return imageUrl;
}

/** Google prefers several images per event; it picks the best crop for the SERP. */
function buildImages(input: EventJsonLdInput): string[] {
  const all = [input.imageUrl, ...(input.galleryUrls ?? [])]
    .map((url) => absoluteEventImage(url ?? null))
    .filter((url): url is string => Boolean(url));
  return [...new Set(all)].slice(0, 6);
}

/**
 * Most imported events have no end time. Emitting `endDate === startDate` tells
 * Google the event is over the moment it starts, which drops the "in 2 days"
 * SERP prefix. Mirrors the fallback duration used by the "live now" badge.
 */
const FALLBACK_DURATION_MINUTES = 90;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function addDays(date: string, days: number): string {
  if (days === 0) return date;
  const shifted = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(shifted.getTime())) return date;
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function buildEndDateTime(input: EventJsonLdInput): string {
  const endTime = input.endTime?.trim();
  if (endTime) return toSofiaIsoDateTime(input.endDate, endTime);

  const isMultiDay = input.endDate !== input.startDate;
  const startTime = input.startTime?.trim();
  if (isMultiDay || !startTime) {
    return toSofiaIsoDateTime(input.endDate, "23:59");
  }

  const [hours, minutes] = startTime.slice(0, 5).split(":").map(Number);
  if (
    hours === undefined ||
    minutes === undefined ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return toSofiaIsoDateTime(input.endDate, "23:59");
  }

  const total = hours * 60 + minutes + FALLBACK_DURATION_MINUTES;
  const dayOffset = Math.floor(total / 1440);
  const inDay = total % 1440;
  return toSofiaIsoDateTime(
    addDays(input.endDate, dayOffset),
    `${pad2(Math.floor(inDay / 60))}:${pad2(inDay % 60)}`,
  );
}

/** `performer` is only meaningful on event types where someone performs. */
const PERFORMER_EVENT_TYPES = new Set<SchemaEventType>([
  "MusicEvent",
  "TheaterEvent",
  "SportsEvent",
]);

function buildPerformer(hosts: Host[], eventType: SchemaEventType) {
  if (!PERFORMER_EVENT_TYPES.has(eventType)) return undefined;

  const mapped = hosts
    .filter((host): host is Host & { name: string } => Boolean(host.name))
    .map((host) => ({
      "@type": "PerformingGroup" as const,
      name: host.name,
      ...(host.link ? { url: host.link } : {}),
    }));

  if (mapped.length === 0) return undefined;
  return mapped.length === 1 ? mapped[0] : mapped;
}

function buildKeywords(tags: EventJsonLdInput["tags"]): string | undefined {
  const titles = (tags ?? [])
    .map((tag) => tag.title?.trim())
    .filter((title): title is string => Boolean(title));
  return titles.length > 0 ? [...new Set(titles)].join(", ") : undefined;
}

function buildLocation(input: EventJsonLdInput) {
  if (!input.place && !input.address && !input.town) return undefined;

  return {
    "@type": "Place" as const,
    name: input.place ?? input.town ?? input.address,
    address: {
      "@type": "PostalAddress" as const,
      ...(input.address ? { streetAddress: input.address } : {}),
      ...(input.town ? { addressLocality: input.town } : {}),
      addressCountry: "BG",
    },
    ...(input.lat != null && input.lng != null
      ? {
          geo: {
            "@type": "GeoCoordinates" as const,
            latitude: input.lat,
            longitude: input.lng,
          },
        }
      : {}),
  };
}

function buildOrganizer(hosts: Host[]) {
  const named = hosts.filter(
    (host): host is Host & { name: string } => Boolean(host.name),
  );
  if (named.length === 0) {
    return {
      "@type": "Organization" as const,
      name: "All4Ruse",
      url: SITE_URL,
    };
  }

  const mapped = named.map((host) => ({
    "@type": "Organization" as const,
    name: host.name,
    ...(host.link ? { url: host.link } : {}),
  }));
  return mapped.length === 1 ? mapped[0] : mapped;
}

function buildOffers(input: EventJsonLdInput) {
  const parsed = parseEventOfferPrice(input.price);
  if (!parsed) return undefined;

  const availability = input.isSoldOut
    ? "https://schema.org/SoldOut"
    : "https://schema.org/InStock";
  const url = input.ticketsLink || input.url;
  const priceCurrency = "EUR";

  if (parsed.kind === "range") {
    return {
      "@type": "AggregateOffer" as const,
      url,
      lowPrice: parsed.low,
      highPrice: parsed.high,
      priceCurrency,
      availability,
    };
  }

  return {
    "@type": "Offer" as const,
    url,
    price: parsed.low,
    priceCurrency,
    availability,
  };
}

export function buildEventJsonLd(input: EventJsonLdInput) {
  const images = buildImages(input);
  const offers = buildOffers(input);
  const parsedPrice = parseEventOfferPrice(input.price);
  const eventType = schemaEventType(input.tags);
  const performer = buildPerformer(input.hosts, eventType);
  const keywords = buildKeywords(input.tags);

  return {
    "@context": "https://schema.org",
    "@type": eventType,
    name: input.name,
    description: input.description,
    url: input.url,
    ...(images.length > 0 ? { image: images } : {}),
    startDate: toSofiaIsoDateTime(input.startDate, input.startTime),
    endDate: buildEndDateTime(input),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: input.isCancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    inLanguage: LOCALE_TO_BCP47[input.locale] ?? input.locale,
    location: buildLocation(input),
    organizer: buildOrganizer(input.hosts),
    ...(performer ? { performer } : {}),
    ...(keywords ? { keywords } : {}),
    ...(offers ? { offers } : {}),
    ...(parsedPrice?.kind === "free" ? { isAccessibleForFree: true } : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.url,
    },
  };
}

/** URL-only ItemList — Google does not award Event rich results on listing pages. */
export function buildEventCollectionJsonLd({
  url,
  name,
  description,
  items,
}: {
  url: string;
  name: string;
  description: string;
  items: { name: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: item.url,
        name: item.name,
      })),
    },
  };
}
