import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import withSerwistInit from "@serwist/next";

import { nextConfigArticleRedirects } from "./src/lib/article-redirects";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Only activate the service worker in production builds.
  // Dev mode leaves caching off so hot-reload and RSC work normally.
  disable: process.env.NODE_ENV === "development",
});

const framingHeader = {
  key: "X-Frame-Options",
  value: "SAMEORIGIN",
};

const sharedSecurityHeaders = [
  // Stop browsers from MIME-sniffing the declared Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send full origin on same-origin requests, only the origin on cross-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Opt out of unused browser features. Geolocation is allowed for the listing map.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  // NOTE: Content-Security-Policy is deferred — the app uses inline scripts
  // (JSON-LD, next/script), YouTube/Google Maps iframes, and Supabase storage
  // URLs that require careful allow-listing before a CSP can be tightened.
];

const securityHeaders = [framingHeader, ...sharedSecurityHeaders];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      // Partner widget — must be framable from local websites. Omit
      // X-Frame-Options here; the catch-all below excludes /embed/.
      { source: "/embed/:path*", headers: sharedSecurityHeaders },
      { source: "/((?!embed/).*)", headers: securityHeaders },
    ];
  },
  async redirects() {
    return [
      ...nextConfigArticleRedirects(),
      // `/current` and `/past` are retired (see src/app/[locale]/_current and
      // _past). They were indexed, so send their traffic to the homepage
      // instead of serving 404s. Delete this block to bring them back.
      {
        source: "/:locale(bg|en|ua|ro)/current",
        destination: "/:locale",
        permanent: true,
      },
      {
        source: "/:locale(bg|en|ua|ro)/past",
        destination: "/:locale",
        permanent: true,
      },
    ];
  },
  experimental: {
    viewTransition: true,
  },
  serverExternalPackages: ["sanitize-html"],
  images: {
    // 75 is the Next default; 90 is used for the logo, where JPEG/WebP
    // artifacts around thin lettering are visible at small sizes.
    qualities: [75, 90],
    // Each width here is a separately billed image transformation, and `sizes`
    // with vw units emits the whole deviceSizes list as one srcSet. Trimmed to
    // the widths this layout actually lands on — nothing renders wider than the
    // 1280px hero, and no fixed slot is under 56px. A visitor between two steps
    // just downloads the next size up.
    deviceSizes: [640, 1080, 1440],
    imageSizes: [64, 128, 256, 384],
    // Stored images never change in place (each upload gets a unique path), so
    // the optimizer can keep an optimized variant for a month instead of
    // re-fetching the original from Supabase Storage as its short
    // Cache-Control expires. Keeps storage egress off the critical path.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
        pathname: "/**",
      },
      // External events / WordPress uploads (e.g. imported scraped images)
      {
        protocol: "https",
        hostname: "ruseonthedanube.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.ruseonthedanube.com",
        pathname: "/**",
      },
    ],
  },
};

export default withSerwist(withNextIntl(nextConfig));
