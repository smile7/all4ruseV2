import { EVENTS_BUCKET, FALLBACK_IMAGE } from "~/constants";
import type { Host } from "~/types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const BG_MONTHS_SHORT = [
  "яну", "фев", "мар", "апр", "май", "юни",
  "юли", "авг", "сеп", "окт", "ное", "дек",
] as const;

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
export function formatDateBadge(dateStr: string): { day: string; month: string } {
  const date = parseLocalDate(dateStr);
  return {
    day: String(date.getDate()),
    month: BG_MONTHS_SHORT[date.getMonth()]!,
  };
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
export function getEventImageUrl(image: string | null): string {
  if (!image) return FALLBACK_IMAGE;
  if (image.startsWith("http") || image.startsWith("/")) return image;
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
