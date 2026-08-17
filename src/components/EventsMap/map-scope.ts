import { todayInSofia } from "~/lib/event-utils";
import type { Event } from "~/types";

const LOCALE_TO_INTL: Record<string, string> = {
  bg: "bg-BG",
  en: "en-GB",
  ua: "uk-UA",
  ro: "ro-RO",
};

export type MappedEvent = Event & { lat: number; lng: number };

export { todayInSofia };

export function hasEventCoords(event: Event): event is MappedEvent {
  return event.lat != null && event.lng != null;
}

/**
 * Today by default; an active from/to filter replaces that window.
 * Overlap: startDate <= rangeEnd AND endDate >= rangeStart.
 */
export function scopeEventsForMap(
  events: Event[],
  from: string,
  to: string,
): Event[] {
  if (from || to) {
    const rangeStart = from || to;
    const rangeEnd = to || from;
    return events.filter(
      (event) => event.startDate <= rangeEnd && event.endDate >= rangeStart,
    );
  }

  const today = todayInSofia();
  return events.filter(
    (event) => event.startDate <= today && event.endDate >= today,
  );
}

export function splitEventsByCoords(events: Event[]): {
  withCoords: MappedEvent[];
  withoutCoords: Event[];
} {
  const withCoords: MappedEvent[] = [];
  const withoutCoords: Event[] = [];

  for (const event of events) {
    if (hasEventCoords(event)) {
      withCoords.push(event);
    } else {
      withoutCoords.push(event);
    }
  }

  return { withCoords, withoutCoords };
}

export type MapPin = {
  key: string;
  lat: number;
  lng: number;
  /** Never empty — a pin only exists because an event put it there. */
  events: [MappedEvent, ...MappedEvent[]];
};

/**
 * One marker per venue. Many events repeat the same address, and markers at
 * identical coords stack — only the top one is clickable, hiding the rest.
 */
export function groupEventsByCoords(events: MappedEvent[]): MapPin[] {
  const pins = new Map<string, MapPin>();

  for (const event of events) {
    const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
    const pin = pins.get(key);
    if (pin) {
      pin.events.push(event);
      continue;
    }
    pins.set(key, { key, lat: event.lat, lng: event.lng, events: [event] });
  }

  return Array.from(pins.values());
}

export function formatMapScopeDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return new Intl.DateTimeFormat(LOCALE_TO_INTL[locale] ?? "bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function eventDetailHref(event: Event, locale: string): string | null {
  if (
    !event.isEventActive ||
    typeof event.slug !== "string" ||
    event.slug.trim() === ""
  ) {
    return null;
  }
  return `/${locale}/${event.slug.trim()}`;
}

export function eventListHref(event: Event): string | null {
  if (
    !event.isEventActive ||
    typeof event.slug !== "string" ||
    event.slug.trim() === ""
  ) {
    return null;
  }
  return `/${event.slug.trim()}`;
}
