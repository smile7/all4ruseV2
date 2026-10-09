import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import {
  AppSerwistProvider,
  CookieConsentProvider,
  Footer,
  Header,
  MobileBottomNav,
  PosterScanTracker,
  ScrollToTopOnNavigate,
  TrackingScripts,
} from "~/components/layout";
import Providers from "~/components/Providers";
import { ThemeProvider } from "~/components/ThemeProvider";
import type { Locale } from "~/constants";
import { AuthProvider } from "~/contexts/AuthContext";
import { routing } from "~/i18n/routing";
import { serializeJsonLd } from "~/lib/article-jsonld";
import { LOCALE_TO_HREFLANG } from "~/lib/seo";
import { buildSiteJsonLd } from "~/lib/site-jsonld";
import { THEME_INIT_SCRIPT } from "~/lib/theme-script";

import { comfortaa } from "../fonts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// No `revalidate` here on purpose: a layout value becomes the floor for every
// page beneath it, so a short window would force all of them to regenerate at
// that rate. The header campaign button handles its own expiry client-side and
// content edits arrive through revalidateTag.

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Without this next-intl resolves the locale from headers, which opts every
  // page in this segment out of static rendering.
  setRequestLocale(locale);

  const messages = await getMessages({ locale });

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
        <link
          rel="alternate"
          type="application/rss+xml"
          title="All4Ruse"
          href={`${siteUrl}/feed.xml`}
        />
        <link
          rel="alternate"
          type="text/calendar"
          title="All4Ruse"
          href={`${siteUrl}/events.ics`}
        />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <Providers>
              <AppSerwistProvider>
                <AuthProvider>
                  <CookieConsentProvider>
                    <ScrollToTopOnNavigate />
                    <Header />
                    {/*
                      main-layout — responsive bottom padding that clears the mobile nav
                      bar (including iOS home indicator safe area) on mobile, and the
                      fixed desktop footer on md+. Defined in globals.css.
                    */}
                    <main className="main-layout min-h-[calc(100svh-3.5rem)] overflow-x-clip xl:px-30">
                      {children}
                    </main>
                    <Footer />
                    <MobileBottomNav />
                    <TrackingScripts />
                    <PosterScanTracker />
                  </CookieConsentProvider>
                </AuthProvider>
              </AppSerwistProvider>
            </Providers>
          </NextIntlClientProvider>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
