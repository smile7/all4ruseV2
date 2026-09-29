import { normalizeEventTagKey } from "~/lib/event-tag-styles";
import { isFreeEventPrice, toSofiaIsoDateTime } from "~/lib/event-utils";
import { jsonLdImages } from "~/lib/seo";
import { SITE_ORGANIZATION_ID, SITE_WEBSITE_ID } from "~/lib/site-jsonld";
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
  /** When the listing was published — the date the offer became available. */
  createdAt: string | null;
  /** Last edit to the listing. Drives the freshness signal for recrawls. */
  updatedAt: string | null;
  tags: { title: string | null }[] | null | undefined;
  hosts: Host[];
};

/**
 * Google Event `Offer.price` must be a number. Imported Grabо prices like
 * `"8–15"` fail Rich Results and can disqualify the whole Event markup.
 *
 * Handles real price strings only. Use `resolveEventOfferPrice` for the app's
 * "empty means free" rule.
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

const FREE_PRICE: ParsedEventPrice = { kind: "free", low: 0, high: 0 };

/**
 * Most listings carry no price because the organiser marked the event free, and
 * an Event with no `offers` loses the price line Google shows in the event card.
 * Mirrors what the detail page renders for the same event.
 */
function resolveEventOfferPrice(
  price: string | null | undefined,
): ParsedEventPrice | null {
  if (isFreeEventPrice(price)) return FREE_PRICE;
  return parseEventOfferPrice(price);
}

function schemaEventType(tags: EventJsonLdInput["tags"]): SchemaEventType {
  for (const tag of tags ?? []) {
    const mapped = EVENT_TYPE_BY_TAG[normalizeEventTagKey(tag.title)];
    if (mapped) return mapped;
  }
  return "Event";
}

/** Google prefers several images per event; it picks the best crop for the SERP. */
function buildImages(input: EventJsonLdInput): string[] {
  return jsonLdImages(input.imageUrl, ...(input.galleryUrls ?? []));
}

/**
 * Most imported events have no end time. Emitting `endDate === startDate` tells
 * Google the event is over the moment it starts, which drops the "in 2 days"
 * SERP prefix. Mirrors the fallback duration used by the "live now" badge.
 */
const FALLBACK_DURATION_MINUTES = 90;

/** The directory is Ruse-only. Google requires a resolvable physical locality. */
const DEFAULT_CITY = "Русе";
const DEFAULT_REGION = "Ruse";

/** `validFrom` / `dateModified` with microseconds fail some Rich Results parsers. */
function toJsonLdInstant(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}

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

  const startTime = input.startTime?.trim();
  // Google flags T23:59 as a timezone footgun and can drop the "in 3 days"
  // prefix. Unknown clock times stay date-only; multi-day events reuse the
  // start clock on the last day rather than inventing midnight.
  if (!startTime) return input.endDate;
  if (input.endDate !== input.startDate) {
    return toSofiaIsoDateTime(input.endDate, startTime);
  }

  const [hours, minutes] = startTime.slice(0, 5).split(":").map(Number);
  if (
    hours === undefined ||
    minutes === undefined ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return input.endDate;
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
  const place = input.place?.trim() || undefined;
  const address = input.address?.trim() || undefined;
  const town = input.town?.trim() || DEFAULT_CITY;

  return {
    "@type": "Place" as const,
    // Venue name only — Google rejects city names here ("Ruse" is not a venue).
    ...(place ? { name: place } : {}),
    address: {
      "@type": "PostalAddress" as const,
      ...(address ? { streetAddress: address } : {}),
      addressLocality: town,
      addressRegion: DEFAULT_REGION,
      addressCountry: "BG",
    },
    ...(input.lat != null && input.lng != null
      ? {
          geo: {
            "@type": "GeoCoordinates" as const,
            latitude: input.lat,
            longitude: input.lng,
          },
          // Ties the venue to a Maps place, which is how Google reconciles a
          // free-text venue name with a real location.
          hasMap: `https://www.google.com/maps/search/?api=1&query=${input.lat},${input.lng}`,
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
      "@id": SITE_ORGANIZATION_ID,
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
  const parsed = resolveEventOfferPrice(input.price);
  if (!parsed) return undefined;

  const availability = input.isSoldOut
    ? "https://schema.org/SoldOut"
    : "https://schema.org/InStock";
  const url = input.ticketsLink || input.url;
  const priceCurrency = "EUR";
  // Google reports a missing `validFrom` on every Event offer. There is no
  // "tickets on sale" field in the data; the listing's creation date is the
  // honest answer to "since when is this offer available".
  const validFromInstant = toJsonLdInstant(input.createdAt);
  const validFrom = validFromInstant
    ? { validFrom: validFromInstant }
    : undefined;
  // Without this the offer reads as open-ended, so a stale copy of the markup
  // can keep advertising tickets for an event that already happened.
  const validThrough = buildEndDateTime(input);

  if (parsed.kind === "range") {
    return {
      "@type": "AggregateOffer" as const,
      url,
      lowPrice: parsed.low,
      highPrice: parsed.high,
      priceCurrency,
      availability,
      ...validFrom,
      validThrough,
    };
  }

  return {
    "@type": "Offer" as const,
    url,
    price: parsed.low,
    priceCurrency,
    availability,
    ...validFrom,
    validThrough,
  };
}

export function buildEventJsonLd(input: EventJsonLdInput) {
  const images = buildImages(input);
  const offers = buildOffers(input);
  const parsedPrice = resolveEventOfferPrice(input.price);
  const eventType = schemaEventType(input.tags);
  const performer = buildPerformer(input.hosts, eventType);
  const keywords = buildKeywords(input.tags);
  const datePublished = toJsonLdInstant(input.createdAt);
  const dateModified = toJsonLdInstant(input.updatedAt) ?? datePublished;

  return {
    "@context": "https://schema.org",
    "@type": eventType,
    "@id": `${input.url}#event`,
    name: input.name,
    description: input.description,
    url: input.url,
    image: images,
    startDate: toSofiaIsoDateTime(input.startDate, input.startTime),
    endDate: buildEndDateTime(input),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: input.isCancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    inLanguage: LOCALE_TO_BCP47[input.locale] ?? input.locale,
    isPartOf: { "@id": SITE_WEBSITE_ID },
    location: buildLocation(input),
    organizer: buildOrganizer(input.hosts),
    ...(performer ? { performer } : {}),
    ...(keywords ? { keywords } : {}),
    ...(offers ? { offers } : {}),
    ...(parsedPrice?.kind === "free" ? { isAccessibleForFree: true } : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.url,
      // The freshness signal Google reads when deciding how often to recrawl.
      // `dateModified` matters most for events whose date or venue changed after
      // the listing was first published.
      ...(datePublished ? { datePublished } : {}),
      ...(dateModified ? { dateModified } : {}),
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
