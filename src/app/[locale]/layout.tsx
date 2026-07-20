import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import {
  AppSerwistProvider,
  CookieConsentProvider,
  FiltersMobileDrawer,
  Footer,
  Header,
  MobileBottomNav,
  TrackingScripts,
} from "~/components/layout";
import Providers from "~/components/Providers";
import { ThemeProvider } from "~/components/ThemeProvider";
import type { Locale } from "~/constants";
import { AuthProvider } from "~/contexts/AuthContext";
import { routing } from "~/i18n/routing";
import { profilesApi } from "~/lib/api";
import { createSupabaseServerClient } from "~/lib/supabase/server";

import "../globals.css";

const comfortaa = localFont({
  variable: "--font-comfortaa",
  display: "swap",
  src: [
    {
      path: "../../../public/fonts/Comfortaa-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Comfortaa-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Comfortaa-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Comfortaa-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Comfortaa-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialUsername = user
    ? ((await profilesApi.getProfile(supabase, user.id)).data?.username ??
      undefined)
    : undefined;

  return (
    <html
      lang={locale}
      className={comfortaa.variable}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <Providers>
              <AppSerwistProvider>
                <AuthProvider userId={user?.id ?? null}>
                  <CookieConsentProvider>
                    <Header />
                    {/* Mobile filter drawer — portal-renders to body, trigger is in Header */}
                    <FiltersMobileDrawer />
                    {/*
                      main-layout — responsive bottom padding that clears the mobile nav
                      bar (including iOS home indicator safe area) on mobile, and the
                      fixed desktop footer on md+. Defined in globals.css.
                    */}
                    <main className="main-layout min-h-[calc(100svh-3.5rem)] overflow-x-clip xl:px-30">
                      {children}
                    </main>
                    <Footer />
                    <MobileBottomNav initialUsername={initialUsername} />
                    <TrackingScripts />
                  </CookieConsentProvider>
                </AuthProvider>
              </AppSerwistProvider>
            </Providers>
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
