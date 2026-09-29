import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getLocale } from "next-intl/server";

import { serializeJsonLd } from "~/lib/article-jsonld";
import { LOCALE_TO_HREFLANG } from "~/lib/seo";
import { buildSiteJsonLd } from "~/lib/site-jsonld";
import { THEME_INIT_SCRIPT } from "~/lib/theme-script";

import "./globals.css";

const comfortaa = localFont({
  variable: "--font-comfortaa",
  display: "swap",
  src: [
    {
      path: "../../public/fonts/Comfortaa-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/Comfortaa-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Comfortaa-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/Comfortaa-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/Comfortaa-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#e06830",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "All4Ruse",
  category: "events",
  title: {
    default: "All4Ruse – всички събития в Русе",
    template: "%s | All4Ruse",
  },
  description: "Всички събития в Русе на едно място.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "All4Ruse",
    statusBarStyle: "default",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "All4Ruse – всички събития в Русе",
    description: "Всички събития в Русе на едно място.",
    url: siteUrl,
    siteName: "All4Ruse",
    locale: "bg_BG",
    type: "website",
    images: [
      {
        url: "/og-home.png?v=2",
        width: 1200,
        height: 630,
        alt: "All4Ruse – събития в Русе",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "All4Ruse – всички събития в Русе",
    description: "Всички събития в Русе на едно място.",
    images: ["/og-home.png?v=2"],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={LOCALE_TO_HREFLANG[locale] ?? locale}
      className={comfortaa.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(buildSiteJsonLd()),
          }}
        />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
