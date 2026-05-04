import { EVENTS_BUCKET, FALLBACK_IMAGE } from "~/constants";
import type { Host } from "~/types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const BG_MONTHS_SHORT = [
  "яну",
  "фев",
  "мар",
  "апр",
  "май",
  "юни",
  "юли",
  "авг",
  "сеп",
  "окт",
  "ное",
  "дек",
] as const;

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

/** Returns `{ day, month }` for the date badge displayed on an EventCard. */
export function formatDateBadge(dateStr: string): {
  day: string;
  month: string;
} {
  const date = parseLocalDate(dateStr);
  return {
    day: String(date.getDate()),
    month: BG_MONTHS_SHORT[date.getMonth()]!,
  };
}

/**
 * Returns a full localised date string for the event detail page.
 * e.g. "събота, 25 февруари 2026" (bg) / "Saturday, 25 February 2026" (en)
 */
export function formatFullDate(dateStr: string, locale: string): string {
  const localeMap: Record<string, string> = {
    bg: "bg-BG",
    en: "en-GB",
    ua: "uk-UA",
    ro: "ro-RO",
  };
  const intlLocale = localeMap[locale] ?? "bg-BG";
  const date = parseLocalDate(dateStr);
  return new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a HH:MM:SS time string to HH:MM.
 * Returns null if the value is empty/null.
 */
export function formatTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  return timeStr.slice(0, 5);
}

/** True when today falls within [startDate, end of endDate]. */
export function isLiveNow(startDate: string, endDate: string): boolean {
  try {
    const today = new Date();
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    end.setHours(23, 59, 59, 999);
    return today >= start && today <= end;
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

// ─── Tag label helpers ────────────────────────────────────────────────────────

// Lookup key is always the uppercased DB title — matches regardless of casing.
// Add new entries here whenever new tags are added to the DB.
const TAG_BG: Record<string, string> = {
  COMEDY: "Комедия",
  THEATRE: "Театър",
  THEATER: "Театър",
  ART: "Изкуство",
  CONCERT: "Концерт",
  CONCERTS: "Концерти",
  SPORTS: "Спорт",
  SPORT: "Спорт",
  KIDS: "Деца",
  CHILDREN: "Деца",
  INFANTS: "Бебета",
  ENGLISH: "Английски език",
  HIKE: "Преход",
  PARTY: "Парти",
  THERAPY: "Терапия",
  DANCES: "Танци",
  DANCE: "Танци",
  GASTRONOMY: "Гастрономия",
  WINE: "Вино",
  MUSIC: "Музика",
  LEARNING: "Обучение",
  EDUCATION: "Образование",
  COMPETITION: "Състезание",
  QUIZ: "Куиз",
  CINEMA: "Кино",
  FILM: "Филм",
  FEST: "Фестивал",
  FESTIVAL: "Фестивал",
  WORKSHOP: "Работилница",
  EXHIBITION: "Изложба",
  FOOD: "Храна",
  TECHNOLOGY: "Технологии",
  VOLUNTEERING: "Благотворителност",
  CHARITY: "Благотворителност",
  FAIR: "Базар",
  OUTDOOR: "На открито",
  NETWORKING: "Социализация",
  GAMES: "Настолни игри",
  MARCHMUSICALDAYS: "Мартенски музикални дни",
  OPERA: "Опера",
  BOOKS: "Книги",
  LITERATURE: "Литература",
  PUPPETTHEATRE: "Куклен театър",
  ROLEPLAYINGGAMES: "Ролеви игри",
  ANIME: "Аниме",
  JAZZ: "Джаз",
  ROCK: "Рок",
  CLASSICAL: "Класическа музика",
  FAMILY: "Семейно",
  PHOTOGRAPHY: "Фотография",
  SCIENCE: "Наука",
  COMEDY_SHOW: "Комедийно шоу",
  MARKET: "Пазар",
};

/**
 * Returns the localised tag label.
 * - Lookup is case-insensitive (keys are normalised to uppercase).
 * - Only /bg gets Bulgarian — every other locale shows the DB title unchanged.
 */
export function getTagLabel(title: string, locale: string): string {
  if (locale === "bg") return TAG_BG[title.toUpperCase()] ?? title;
  return title;
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
    text: event.title,
    dates: `${d0}T${t0}/${d1}T${t1}`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
