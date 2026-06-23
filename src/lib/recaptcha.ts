/**
 * Executes reCAPTCHA v3 and returns a token for server-side verification.
 * Returns null when the site key is not configured or when called server-side
 * (e.g. during SSR) — callers should skip verification in that case.
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey || typeof window === "undefined" || !window.grecaptcha) {
    return null;
  }

  return new Promise((resolve) => {
    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(siteKey, { action })
        .then(resolve)
        .catch(() => resolve(null));
    });
  });
}
