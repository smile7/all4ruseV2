import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Only activate the service worker in production builds.
  // Dev mode leaves caching off so hot-reload and RSC work normally.
  disable: process.env.NODE_ENV === "development",
});

const securityHeaders = [
  // Prevent the site from being embedded in foreign iframes (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop browsers from MIME-sniffing the declared Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send full origin on same-origin requests, only the origin on cross-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Opt out of browser features that the site does not use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // NOTE: Content-Security-Policy is deferred — the app uses inline scripts
  // (JSON-LD, next/script), YouTube/Google Maps iframes, and Supabase storage
  // URLs that require careful allow-listing before a CSP can be tightened.
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    viewTransition: true,
  },
  images: {
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
