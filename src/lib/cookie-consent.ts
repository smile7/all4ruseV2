export const COOKIE_CONSENT_STORAGE_KEY = "a4r-cookie-consent";

export type CookieConsent = {
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export function createCookieConsent(
  values: Pick<CookieConsent, "analytics" | "marketing">,
): CookieConsent {
  return {
    ...values,
    updatedAt: new Date().toISOString(),
  };
}

export function hasAnalyticsConsent(
  consent: CookieConsent | null | undefined,
): boolean {
  return consent?.analytics === true;
}

export function hasMarketingConsent(
  consent: CookieConsent | null | undefined,
): boolean {
  return consent?.marketing === true;
}