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

const nextConfig: NextConfig = {
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
