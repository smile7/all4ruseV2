import { LOCALES } from "~/constants";

/**
 * Builds the `alternates` block for Next.js `generateMetadata`.
 *
 * Produces a per-locale canonical URL plus hreflang tags for all 4 supported
 * locales. `path` should start with "/" (e.g. "" for the locale home, "/past",
 * "/why-all4ruse", "/user/johndoe").
 *
 * The route locale is used as the hreflang key directly (matching the URL
 * structure: /bg, /en, /ua, /ro).
 */
export function buildAlternates(locale: string, path: string = "") {
  return {
    canonical: `/${locale}${path}`,
    languages: Object.fromEntries(
      LOCALES.map((lang) => [lang, `/${lang}${path}`]),
    ),
  };
}
