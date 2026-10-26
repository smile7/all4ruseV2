import { DEFAULT_LOCALE } from "~/constants";
import { buildHostAlternates, hostPath } from "~/lib/seo";
import type { EventHost } from "~/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

export function hostCanonicalUrl(slug: string): string {
  return buildHostAlternates(slug).canonical;
}

/**
 * Stable entity id shared by the host page and every linked event's
 * `organizer`, so Google can join them into one Organization.
 */
export function hostOrganizationId(slug: string): string {
  return `${SITE_URL}/${DEFAULT_LOCALE}${hostPath(slug)}#organization`;
}

export function buildHostOrganizationJsonLd(host: EventHost) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": hostOrganizationId(host.slug),
    name: host.name,
    url: hostCanonicalUrl(host.slug),
    ...(host.website ? { sameAs: [host.website] } : {}),
    ...(host.phone ? { telephone: host.phone } : {}),
    ...(host.email ? { email: host.email } : {}),
    ...(host.address || host.place
      ? {
          location: {
            "@type": "Place",
            name: host.place ?? host.address,
            ...(host.address
              ? {
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: host.address,
                    addressCountry: "BG",
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}
