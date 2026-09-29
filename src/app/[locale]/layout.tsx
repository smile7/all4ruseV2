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
  ScrollToTopOnNavigate,
  TrackingScripts,
} from "~/components/layout";
import Providers from "~/components/Providers";
import { ThemeProvider } from "~/components/ThemeProvider";
import type { Locale } from "~/constants";
import { AuthProvider } from "~/contexts/AuthContext";
import { routing } from "~/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
              </CookieConsentProvider>
            </AuthProvider>
          </AppSerwistProvider>
        </Providers>
      </NextIntlClientProvider>
      <Analytics />
      <SpeedInsights />
    </ThemeProvider>
  );
}
