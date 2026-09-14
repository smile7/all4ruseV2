import {
  FACEBOOK_URL,
  INSTAGRAM_URL,
  TIKTOK_URL,
} from "~/constants";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

export const SITE_ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const SITE_WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * Sitewide identity graph. Linked from Article `publisher` via the same `@id`.
 * Not LocalBusiness — All4Ruse is an events publisher, not a venue.
 */
export function buildSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": SITE_ORGANIZATION_ID,
        name: "All4Ruse",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/android-chrome-512x512.png`,
          width: 512,
          height: 512,
        },
        sameAs: [FACEBOOK_URL, INSTAGRAM_URL, TIKTOK_URL],
        areaServed: {
          "@type": "City",
          name: "Ruse",
          containedInPlace: {
            "@type": "Country",
            name: "Bulgaria",
          },
        },
      },
      {
        "@type": "WebSite",
        "@id": SITE_WEBSITE_ID,
        url: SITE_URL,
        name: "All4Ruse",
        publisher: { "@id": SITE_ORGANIZATION_ID },
        inLanguage: ["bg", "en", "uk", "ro"],
      },
    ],
  };
}
