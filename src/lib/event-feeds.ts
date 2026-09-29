import { DEFAULT_LOCALE } from "~/constants";
import {
  formatEventTitle,
  getEventEndMs,
  getEventImageUrl,
  getEventStartMs,
} from "~/lib/event-utils";
import type { Event } from "~/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

export const EVENTS_FEED_LIMIT = 100;

export function eventPublicUrl(slug: string): string {
  return `${SITE_URL}/${DEFAULT_LOCALE}/${slug}`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rssDate(value: string | number): string {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toUTCString();
  return date.toUTCString();
}

export function buildEventsRss(events: Event[]): string {
  const items = events
    .filter(
      (event): event is Event & { slug: string } =>
        typeof event.slug === "string" && event.slug.length > 0,
    )
    .slice(0, EVENTS_FEED_LIMIT)
    .map((event) => {
      const title = formatEventTitle(event.title);
      const url = eventPublicUrl(event.slug);
      const where = [event.place, event.town].filter(Boolean).join(", ");
      const description = [event.startDate, event.startTime, where]
        .filter(Boolean)
        .join(" · ");
      const image = getEventImageUrl(event.image);
      const enclosure =
        image && !image.startsWith("/")
          ? `<enclosure url="${xmlEscape(image)}" type="image/jpeg" />`
          : "";

      return `    <item>
      <title>${xmlEscape(title)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      <pubDate>${rssDate(event.created_at)}</pubDate>
      <description>${xmlEscape(description)}</description>
      ${enclosure}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>All4Ruse — събития в Русе</title>
    <link>${SITE_URL}/${DEFAULT_LOCALE}</link>
    <description>Предстоящи събития в Русе, България.</description>
    <language>bg</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsUtc(ms: number): string {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return parts.join("\r\n");
}

export function buildEventsIcs(events: Event[]): string {
  const stamp = icsUtc(Date.now());
  const vevents = events
    .filter(
      (event): event is Event & { slug: string } =>
        typeof event.slug === "string" && event.slug.length > 0,
    )
    .slice(0, EVENTS_FEED_LIMIT)
    .map((event) => {
      const title = formatEventTitle(event.title);
      const url = eventPublicUrl(event.slug);
      const location = [event.place, event.address, event.town]
        .filter(Boolean)
        .join(", ");
      const lines = [
        "BEGIN:VEVENT",
        `UID:${event.slug}@all4ruse.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsUtc(getEventStartMs(event))}`,
        `DTEND:${icsUtc(getEventEndMs(event))}`,
        foldIcsLine(`SUMMARY:${icsEscape(title)}`),
        ...(location
          ? [foldIcsLine(`LOCATION:${icsEscape(location)}`)]
          : []),
        foldIcsLine(`URL:${url}`),
        "END:VEVENT",
      ];
      return lines.join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//All4Ruse//Events//BG",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:All4Ruse",
    vevents,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
