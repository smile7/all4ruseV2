export const EVENTS_BUCKET = "event-images";
export const THEME_STORE_KEY = "theme";
export const FALLBACK_IMAGE = "/no-image.png";
export const DEFAULT_AVATAR = "/cat.png";
export const DEBOUNCE_MS = 400;
export const EMPTY_DISPLAY = "—";

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
