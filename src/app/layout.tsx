import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { ThemeProvider } from "~/components/ThemeProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={comfortaa.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

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
