"use client";

import { useLocalStorage } from "~/hooks/useLocalStorage";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsent,
} from "~/lib/cookie-consent";

export function useCookieConsent() {
  return useLocalStorage<CookieConsent | null>(COOKIE_CONSENT_STORAGE_KEY, null);
}