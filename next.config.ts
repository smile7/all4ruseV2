import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

export default withNextIntl(nextConfig);
