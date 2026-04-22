import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { BREAKPOINTS, type ScreenSize } from "~/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred.";
}

export function formatEventDate(date: string, locale = "bg-BG"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

// Converts a Tailwind v4 breakpoint CSS variable name to a min-width media query string.
// e.g. getMinWidth("--breakpoint-lg") → "(min-width: 1024px)"
export function getMinWidth(name: `--breakpoint-${ScreenSize}`): string {
  const key = name.replace("--breakpoint-", "") as ScreenSize;
  return `(min-width: ${BREAKPOINTS[key]})`;
}
