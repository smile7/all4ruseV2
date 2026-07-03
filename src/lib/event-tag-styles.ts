type TagStyleSet = {
  idle: string;
  selected: string;
  hash: string;
};

const IDLE = "border-primary/20 bg-primary/10 text-foreground";

const FALLBACK_PALETTE: TagStyleSet[] = [
  {
    idle: IDLE,
    selected: "border-rose-500 bg-rose-500 text-white dark:border-rose-600 dark:bg-rose-600",
    hash: "text-rose-500 dark:text-rose-400",
  },
  {
    idle: IDLE,
    selected: "border-amber-500 bg-amber-500 text-white dark:border-amber-600 dark:bg-amber-600",
    hash: "text-amber-500 dark:text-amber-400",
  },
  {
    idle: IDLE,
    selected: "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-600 dark:bg-emerald-600",
    hash: "text-emerald-500 dark:text-emerald-400",
  },
  {
    idle: IDLE,
    selected: "border-sky-500 bg-sky-500 text-white dark:border-sky-600 dark:bg-sky-600",
    hash: "text-sky-500 dark:text-sky-400",
  },
  {
    idle: IDLE,
    selected: "border-violet-500 bg-violet-500 text-white dark:border-violet-600 dark:bg-violet-600",
    hash: "text-violet-500 dark:text-violet-400",
  },
  {
    idle: IDLE,
    selected: "border-fuchsia-500 bg-fuchsia-500 text-white dark:border-fuchsia-600 dark:bg-fuchsia-600",
    hash: "text-fuchsia-500 dark:text-fuchsia-400",
  },
  {
    idle: IDLE,
    selected: "border-orange-500 bg-orange-500 text-white dark:border-orange-600 dark:bg-orange-600",
    hash: "text-orange-500 dark:text-orange-400",
  },
  {
    idle: IDLE,
    selected: "border-teal-500 bg-teal-500 text-white dark:border-teal-600 dark:bg-teal-600",
    hash: "text-teal-500 dark:text-teal-400",
  },
  {
    idle: IDLE,
    selected: "border-indigo-500 bg-indigo-500 text-white dark:border-indigo-600 dark:bg-indigo-600",
    hash: "text-indigo-500 dark:text-indigo-400",
  },
  {
    idle: IDLE,
    selected: "border-lime-600 bg-lime-600 text-white dark:border-lime-700 dark:bg-lime-700",
    hash: "text-lime-600 dark:text-lime-500",
  },
  {
    idle: IDLE,
    selected: "border-cyan-600 bg-cyan-600 text-white dark:border-cyan-700 dark:bg-cyan-700",
    hash: "text-cyan-600 dark:text-cyan-500",
  },
  {
    idle: IDLE,
    selected: "border-pink-500 bg-pink-500 text-white dark:border-pink-600 dark:bg-pink-600",
    hash: "text-pink-500 dark:text-pink-400",
  },
];

/** Semantic colors for known event categories. */
const TAG_STYLES: Record<string, TagStyleSet> = {
  COMEDY: FALLBACK_PALETTE[1]!,
  THEATRE: FALLBACK_PALETTE[4]!,
  ART: FALLBACK_PALETTE[5]!,
  CONCERT: FALLBACK_PALETTE[8]!,
  SPORTS: FALLBACK_PALETTE[2]!,
  KIDS: FALLBACK_PALETTE[3]!,
  ENGLISH: FALLBACK_PALETTE[3]!,
  HIKE: FALLBACK_PALETTE[9]!,
  PARTY: FALLBACK_PALETTE[0]!,
  THERAPY: FALLBACK_PALETTE[7]!,
  DANCES: FALLBACK_PALETTE[4]!,
  GASTRONOMY: FALLBACK_PALETTE[6]!,
  WINE: FALLBACK_PALETTE[0]!,
  MUSIC: FALLBACK_PALETTE[8]!,
  LEARNING: FALLBACK_PALETTE[8]!,
  COMPETITION: FALLBACK_PALETTE[6]!,
  QUIZ: FALLBACK_PALETTE[10]!,
  CINEMA: {
    idle: IDLE,
    selected: "border-slate-600 bg-slate-600 text-white dark:border-slate-700 dark:bg-slate-700",
    hash: "text-slate-500 dark:text-slate-400",
  },
  FEST: FALLBACK_PALETTE[1]!,
  WORKSHOP: {
    idle: IDLE,
    selected: "border-stone-600 bg-stone-600 text-white dark:border-stone-700 dark:bg-stone-700",
    hash: "text-stone-500 dark:text-stone-400",
  },
  EXHIBITION: FALLBACK_PALETTE[5]!,
  FOOD: FALLBACK_PALETTE[6]!,
  TECHNOLOGY: FALLBACK_PALETTE[10]!,
  VOLUNTEERING: FALLBACK_PALETTE[2]!,
  FAIR: FALLBACK_PALETTE[1]!,
  OUTDOOR: FALLBACK_PALETTE[9]!,
  NETWORKING: FALLBACK_PALETTE[3]!,
  INFANTS: FALLBACK_PALETTE[11]!,
  GAMES: FALLBACK_PALETTE[4]!,
  MARCHMUSICALDAYS: FALLBACK_PALETTE[8]!,
  OPERA: FALLBACK_PALETTE[4]!,
  BOOKS: {
    idle: IDLE,
    selected: "border-amber-700 bg-amber-700 text-white dark:border-amber-800 dark:bg-amber-800",
    hash: "text-amber-600 dark:text-amber-500",
  },
  PUPPETTHEATRE: FALLBACK_PALETTE[6]!,
  ROLEPLAYINGGAMES: FALLBACK_PALETTE[4]!,
  ANIME: FALLBACK_PALETTE[11]!,
  LITERATURE: {
    idle: IDLE,
    selected: "border-amber-600 bg-amber-600 text-white dark:border-amber-700 dark:bg-amber-700",
    hash: "text-amber-600 dark:text-amber-500",
  },
};

/**
 * Tags that exist in the database but should not appear anywhere in the UI.
 * Add/remove keys here to control visibility without touching the DB.
 */
export const HIDDEN_TAG_KEYS = new Set([
  "GASTRONOMY",
  "FAIR",
  "INFANTS",
  "MARCHMUSICALDAYS",
  "PUPPETTHEATRE",
  "LITERATURE",
]);

function hashTagKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function normalizeEventTagKey(title: string | null | undefined): string {
  return (title?.trim() ?? "").toUpperCase().replace(/[\s_-]+/g, "");
}

export function getEventTagStyles(
  title: string | null | undefined,
): TagStyleSet {
  const key = normalizeEventTagKey(title);
  if (key && TAG_STYLES[key]) return TAG_STYLES[key]!;
  const index = hashTagKey(key) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[index]!;
}

/** Turn shouty ALL CAPS labels into readable title case. */
export function formatEventTagDisplayLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "";

  if (trimmed !== trimmed.toUpperCase()) return trimmed;

  return trimmed
    .split(/(\s+|[-–])/)
    .map((part) => {
      if (/^\s+$/.test(part) || part === "-" || part === "–") return part;
      const lower = part.toLocaleLowerCase();
      return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
    })
    .join("");
}
