import { EVENTS_BUCKET, FALLBACK_IMAGE } from "~/constants";
import type { Host } from "~/types";

export type EventSchedule = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string | null;
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** 3-letter uppercase month abbreviations per locale — used in the EventCard badge. */
const MONTH_ABBREVS: Record<string, readonly string[]> = {
  "bg-BG": [
    "ЯНУ",
    "ФЕВ",
    "МАР",
    "АПР",
    "МАЙ",
    "ЮНИ",
    "ЮЛИ",
    "АВГ",
    "СЕП",
    "ОКТ",
    "НОЕ",
    "ДЕК",
  ],
  "en-GB": [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ],
  "uk-UA": [
    "СІЧ",
    "ЛЮТ",
    "БЕР",
    "КВІ",
    "ТРА",
    "ЧЕР",
    "ЛИП",
    "СЕР",
    "ВЕР",
    "ЖОВ",
    "ЛИС",
    "ГРУ",
  ],
  "ro-RO": [
    "IAN",
    "FEB",
    "MAR",
    "APR",
    "MAI",
    "IUN",
    "IUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ],
};

const localeMap: Record<string, string> = {
  bg: "bg-BG",
  en: "en-GB",
  ua: "uk-UA",
  ro: "ro-RO",
};

type RelativeDateLabels = {
  today: string;
  tomorrow: string;
};

const FACEBOOK_CDN_HOST_SUFFIX = ".fbcdn.net";

/**
 * Parses a YYYY-MM-DD string without timezone shift.
 * Using `new Date("YYYY-MM-DD")` would parse as UTC midnight and shift
 * the day backwards in negative-offset timezones.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function getIntlLocale(locale: string): string {
  return localeMap[locale] ?? "bg-BG";
}

/** Bulgarian detail-page dates: lowercase labels and "2026г." without a space. */
function normalizeFullDateDisplay(formatted: string, locale: string): string {
  if (locale !== "bg") return formatted;

  return formatted.replace(/(\d+)\s+г\./g, "$1г.").toLocaleLowerCase("bg-BG");
}

function startOfLocalDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getCalendarDayDiff(date: Date, now: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) /
      msPerDay,
  );
}

function formatRelativeDateLabel(
  dateStr: string,
  locale: string,
  labels: RelativeDateLabels | undefined,
  now = new Date(),
): string | null {
  if (!labels) return null;

  const date = parseLocalDate(dateStr);
  const dayDiff = getCalendarDayDiff(date, now);

  if (dayDiff === 0) return labels.today;
  if (dayDiff === 1) return labels.tomorrow;
  if (dayDiff >= 2 && dayDiff <= 4) {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      weekday: "long",
    }).format(date);
  }

  return null;
}

/**
 * Returns the localized date badge content displayed on an EventCard.
 * - Today / tomorrow → `{ primary: "ДНЕС" | "УТРЕ", secondary: null }` (time still shown separately).
 * - All other dates  → `{ primary: "11 ЮНИ", secondary: "ЧЕТВЪРТЪК" }`.
 */
export function formatDateBadge(
  dateStr: string,
  locale = "bg",
  labels?: RelativeDateLabels,
): {
  primary: string;
  secondary: string | null;
} {
  const date = parseLocalDate(dateStr);
  const intlLocale = getIntlLocale(locale);

  // Today / tomorrow: single uppercase label, no weekday line
  if (labels) {
    const dayDiff = getCalendarDayDiff(date, new Date());
    if (dayDiff === 0)
      return {
        primary: labels.today.toLocaleUpperCase(intlLocale),
        secondary: null,
      };
    if (dayDiff === 1)
      return {
        primary: labels.tomorrow.toLocaleUpperCase(intlLocale),
        secondary: null,
      };
  }

  const day = date.getDate();
  // Hardcoded 3-letter arrays: Intl month:"short" returns numeric "06" in limited-ICU Node.js builds
  const monthAbbrevs = MONTH_ABBREVS[intlLocale] ?? MONTH_ABBREVS["bg-BG"]!;
  const primary = `${day} ${monthAbbrevs[date.getMonth()]!}`;

  // Full weekday name, uppercase (e.g. "ЧЕТВЪРТЪК") — long weekday works in all environments
  const weekday = new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
  }).format(date);
  const secondary = weekday.toLocaleUpperCase(intlLocale);

  return { primary, secondary };
}

/**
 * Returns a full localised date string for the event detail page.
 * e.g. "събота, 25 февруари 2026г." (bg) / "Saturday, 25 February 2026" (en)
 * Near-term dates keep relative labels (today/tomorrow) but always include the calendar date.
 */
export function formatFullDate(
  dateStr: string,
  locale: string,
  labels?: RelativeDateLabels,
): string {
  const date = parseLocalDate(dateStr);
  const intlLocale = getIntlLocale(locale);
  const fullDate = new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  const relativeLabel = formatRelativeDateLabel(dateStr, locale, labels);
  if (!relativeLabel) {
    return normalizeFullDateDisplay(fullDate, locale);
  }

  const dayDiff = getCalendarDayDiff(date, new Date());
  if (dayDiff === 0 || dayDiff === 1) {
    const dateOnly = new Intl.DateTimeFormat(intlLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
    return normalizeFullDateDisplay(`${relativeLabel}, ${dateOnly}`, locale);
  }

  return normalizeFullDateDisplay(fullDate, locale);
}

export function formatEventMonthHeading(
  dateStr: string,
  locale: string,
): string {
  const date = parseLocalDate(dateStr);
  const intlLocale = getIntlLocale(locale);
  const month = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
  }).format(date);
  return month.charAt(0).toLocaleUpperCase(intlLocale) + month.slice(1);
}

/**
 * Formats a HH:MM:SS time string to HH:MM.
 * Returns null if the value is empty/null.
 */
export function formatTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  return timeStr.slice(0, 5);
}

/**
 * Appends the date range to a multi-day event title for calendar display.
 * Single-day events are returned unchanged.
 * Format: "Събитие: 14.07-20.07."
 */
export function formatEventTitleWithDateRange(
  title: string,
  startDate: string,
  endDate: string,
): string {
  const formatted = formatEventTitle(title);
  if (startDate === endDate) return formatted;

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  const startDay = String(start.getDate()).padStart(2, "0");
  const startMonth = String(start.getMonth() + 1).padStart(2, "0");
  const endDay = String(end.getDate()).padStart(2, "0");
  const endMonth = String(end.getMonth() + 1).padStart(2, "0");

  return `${formatted}: ${startDay}.${startMonth}-${endDay}.${endMonth}.`;
}

/** Normalizes imported event titles to title case for consistent display. */
export function formatEventTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized) return title;

  return normalized
    .toLocaleLowerCase()
    .replace(
      /(^|[\s"'“„(\/-])(\p{L})/gu,
      (_, prefix: string, letter: string) =>
        `${prefix}${letter.toLocaleUpperCase()}`,
    );
}

/**
 * The timezone all events are anchored to — Bulgaria year-round.
 * Using Intl instead of setHours() makes the comparison timezone-agnostic:
 * Vercel servers run in UTC, but event times are entered as Sofia wall-clock times.
 */
const APP_TIMEZONE = "Europe/Sofia";

/** Today's date as YYYY-MM-DD in Europe/Sofia (Vercel runs in UTC). */
export function todayInSofia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(
    new Date(),
  );
}

function parseClockOnLocalDate(dateStr: string, timeStr: string): Date {
  // Strip timezone offset returned by Supabase timetz columns (e.g. "13:00:00+00" → "13:00:00")
  const clean = timeStr.replace(/[+-]\d{2}(:\d{2})?$/, "");
  const parts = clean.split(":").map(Number);
  const hh = parts[0] ?? 0;
  const mm = parts[1] ?? 0;
  const ss = parts[2] ?? 0;

  // Build a UTC ms value treating hh:mm:ss as a naive UTC anchor, then
  // shift by the Europe/Sofia offset so the result is the correct UTC instant.
  // This is DST-aware and server-timezone-independent.
  const [y, mo, d] = dateStr.split("-").map(Number);
  const naiveUtcMs = Date.UTC(y!, mo! - 1, d!, hh, mm, ss, 0);

  const probe = new Date(naiveUtcMs);
  const sofiaParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(probe);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(sofiaParts.find((p) => p.type === type)?.value ?? 0);

  // Reconstruct what Sofia's wall clock reads for this UTC instant as if it were UTC.
  const sofiaAsUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );

  // offset = naiveUtcMs − sofiaAsUtcMs (e.g. −10 800 000 ms for UTC+3 in summer).
  return new Date(naiveUtcMs + (naiveUtcMs - sofiaAsUtcMs));
}

/** Start instant in local time (defaults to midnight if `startTime` is empty). */
export function getEventStartMs(event: EventSchedule): number {
  const t = event.startTime?.trim();
  if (!t) return parseLocalDate(event.startDate).getTime();
  try {
    return parseClockOnLocalDate(event.startDate, t).getTime();
  } catch {
    return parseLocalDate(event.startDate).getTime();
  }
}

/**
 * End instant in local time.
 * - Explicit `endTime` → exact end instant on `endDate`.
 * - Single-day events without `endTime` → 90 minutes after `startTime`.
 * - Multi-day events without `endTime` → end of `endDate` (23:59:59.999).
 */
export function getEventEndMs(event: EventSchedule): number {
  const t = event.endTime?.trim();
  try {
    if (t) return parseClockOnLocalDate(event.endDate, t).getTime();
    if (event.startDate === event.endDate) {
      return getEventStartMs(event) + LIVE_FALLBACK_DURATION_MS;
    }
    const d = parseLocalDate(event.endDate);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  } catch {
    if (event.startDate === event.endDate) {
      try {
        return getEventStartMs(event) + LIVE_FALLBACK_DURATION_MS;
      } catch {
        return parseLocalDate(event.endDate).getTime();
      }
    }
    const d = parseLocalDate(event.endDate);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }
}

export function isEventEnded(
  event: EventSchedule,
  now: Date = new Date(),
): boolean {
  try {
    return now.getTime() > getEventEndMs(event);
  } catch {
    return false;
  }
}

/** Maximum duration for a single-day event without an explicit end time. */
const LIVE_FALLBACK_DURATION_MS = 90 * 60 * 1000; // 1.5 hours

/**
 * True while the event is in progress:
 * - If `endTime` is set → live between start and end instants (inclusive).
 * - If `endTime` is absent → live for up to 1.5 hours after `startTime`.
 */
export function isLiveNow(
  event: EventSchedule,
  now: Date = new Date(),
): boolean {
  try {
    const t = now.getTime();
    const startMs = getEventStartMs(event);
    if (t < startMs) return false;
    if (event.endTime?.trim()) return t <= getEventEndMs(event);
    return t <= startMs + LIVE_FALLBACK_DURATION_MS;
  } catch {
    return false;
  }
}

/**
 * Returns a localized relative time string showing how long ago the event started,
 * e.g. "ПРЕДИ 27 МИНУТИ" (bg) or "27 MINUTES AGO" (en).
 *
 * Intended for client-side use only — relies on browser Intl data.
 */
export function formatLiveElapsed(
  event: EventSchedule,
  locale: string,
  now = new Date(),
): string {
  const intlLocale = getIntlLocale(locale);
  const elapsedMs = now.getTime() - getEventStartMs(event);
  const elapsedMinutes = Math.max(1, Math.floor(elapsedMs / 60000));
  const rtf = new Intl.RelativeTimeFormat(intlLocale, {
    numeric: "always",
    style: "long",
  });
  if (elapsedMinutes < 60) {
    return rtf.format(-elapsedMinutes, "minutes").toLocaleUpperCase(intlLocale);
  }
  return rtf
    .format(-Math.floor(elapsedMinutes / 60), "hours")
    .toLocaleUpperCase(intlLocale);
}

/**
 * Home active grid: ended events excluded; multi-calendar-day events only on
 * `startDate` (and still listed before they start). Middle/end days are omitted until the event is past.
 */
export function isVisibleOnHomeActiveList(
  event: EventSchedule,
  todayYmd: string,
  now: Date = new Date(),
): boolean {
  try {
    if (isEventEnded(event, now)) return false;
    if (event.startDate < event.endDate) {
      if (todayYmd < event.startDate) return true;
      if (todayYmd === event.startDate) return true;
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Multi-day events from calendar day 2 through the last day, until the end instant.
 * (Day 1 is listed on the home grid via `isVisibleOnHomeActiveList`.)
 */
export function isVisibleOnCurrentEventsList(
  event: EventSchedule,
  todayYmd: string,
  now: Date = new Date(),
): boolean {
  try {
    if (isEventEnded(event, now)) return false;
    if (event.startDate >= event.endDate) return false;
    if (todayYmd <= event.startDate) return false;
    if (todayYmd > event.endDate) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Image helpers ────────────────────────────────────────────────────────────

/**
 * Resolves an event image value to a full URL.
 * - `null` → fallback placeholder
 * - absolute URL or public path (`/…`) → used as-is
 * - bare filename → Supabase Storage public URL
 */
function isExpiredFacebookCdnImageUrl(imageUrl: string): boolean {
  try {
    const url = new URL(imageUrl);

    if (!url.hostname.endsWith(FACEBOOK_CDN_HOST_SUFFIX)) {
      return false;
    }

    const expiresAtHex = url.searchParams.get("oe");
    if (!expiresAtHex) {
      return false;
    }

    const expiresAt = Number.parseInt(expiresAtHex, 16);
    if (!Number.isFinite(expiresAt)) {
      return false;
    }

    return Date.now() >= expiresAt * 1000;
  } catch {
    return false;
  }
}

export function getEventImageUrl(image: string | null): string {
  if (!image) return FALLBACK_IMAGE;
  if (image.startsWith("/")) return image;

  if (image.startsWith("http")) {
    return isExpiredFacebookCdnImageUrl(image) ? FALLBACK_IMAGE : image;
  }

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${EVENTS_BUCKET}/${image}`;
}

// ─── Host helpers ─────────────────────────────────────────────────────────────

/** Extracts the first host name from the JSON `organizers` column. */
export function getFirstHostName(organizers: unknown): string | null {
  if (!Array.isArray(organizers) || organizers.length === 0) return null;
  const first = organizers[0] as Host;
  return first?.name ?? null;
}

// ─── Tag color helpers ────────────────────────────────────────────────────────

/**
 * Derives a unique hue for a tag ID using the golden angle (≈137.5°).
 * Guarantees maximum perceptual distance between any two adjacent IDs —
 * no palette size limit, every tag ID gets a visually distinct color.
 */
export function getTagHue(id: number): number {
  return Math.round((id * 137.508) % 360);
}

// ─── Other helpers ─────────────────────────────────────────────────────────

export function buildGCalUrl(event: {
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string | null;
  place: string | null;
  address: string;
  town: string;
}): string {
  const d0 = event.startDate.replace(/-/g, "");
  const d1 = event.endDate.replace(/-/g, "");
  const t0 = event.startTime.replace(/:/g, "").slice(0, 6).padEnd(6, "0");
  const t1 = event.endTime
    ? event.endTime.replace(/:/g, "").slice(0, 6).padEnd(6, "0")
    : t0;
  const location = [event.place, event.address, event.town]
    .filter(Boolean)
    .join(", ");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: formatEventTitle(event.title),
    dates: `${d0}T${t0}/${d1}T${t1}`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
