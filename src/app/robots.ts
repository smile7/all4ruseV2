import type { MetadataRoute } from "next";

import { LOCALES } from "~/constants";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

// Private paths that should never be indexed — one entry per locale prefix
// because routes are locale-prefixed (/bg/auth/...) and a bare /auth/ disallow
// does not match /bg/auth/ in standard robots.txt parsing.
const PRIVATE_PATHS = ["/auth/", "/profile", "/my-events", "/create-event"];
const privateDisallows = LOCALES.flatMap((locale) =>
  PRIVATE_PATHS.map((path) => `/${locale}${path}`),
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Good AI crawlers — explicit allow so they can cite the site in answers.
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "cohere-ai", allow: "/" },

      // Bulk scrapers with no reciprocal value — block to protect bandwidth.
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "PetalBot", disallow: "/" },

      // Default: allow crawling, block private/auth routes and API.
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...privateDisallows],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
