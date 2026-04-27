export const EVENTS_BUCKET = "event-images";
export const EVENTS_PAGE_SIZE = 12;
export const PAST_EVENTS_WINDOW_DAYS = 15;
export const THEME_STORE_KEY = "theme";
export const FALLBACK_IMAGE = "/no-image.png";
export const DEFAULT_AVATAR = "/cat.png";
export const DEBOUNCE_MS = 400;
export const EMPTY_DISPLAY = "—";

export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61586926929594";
export const INSTAGRAM_URL = "https://www.instagram.com/all4ruse";
export const TIKTOK_URL = "https://www.tiktok.com/@all4ruse";
export const FACEBOOK_BRAND_COLOR = "#1877F2";
export const INSTAGRAM_BRAND_COLOR = "#E4405F";

export const LOCALES = ["bg", "en", "ua", "ro"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "bg";

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export type ScreenSize = keyof typeof BREAKPOINTS;

export const TAG_COLOR_CLASSES = [
  "bg-rose-50     text-rose-500     dark:bg-rose-950/50     dark:text-rose-300",
  "bg-sky-50      text-sky-500      dark:bg-sky-950/50      dark:text-sky-300",
  "bg-violet-50   text-violet-500   dark:bg-violet-950/50   dark:text-violet-300",
  "bg-emerald-50  text-emerald-600  dark:bg-emerald-950/50  dark:text-emerald-300",
  "bg-amber-50    text-amber-500    dark:bg-amber-950/50    dark:text-amber-300",
  "bg-fuchsia-50  text-fuchsia-500  dark:bg-fuchsia-950/50  dark:text-fuchsia-300",
  "bg-teal-50     text-teal-600     dark:bg-teal-950/50     dark:text-teal-300",
  "bg-orange-50   text-orange-500   dark:bg-orange-950/50   dark:text-orange-300",
] as const;