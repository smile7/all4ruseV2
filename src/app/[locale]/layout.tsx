import localFont from "next/font/local";
import { notFound } from "next/navigation";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import {
  FiltersMobileDrawer,
  Footer,
  Header,
  MobileBottomNav,
} from "~/components/layout";
import Providers from "~/components/Providers";
import { ThemeProvider } from "~/components/ThemeProvider";
import type { Locale } from "~/constants";
import { routing } from "~/i18n/routing";

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
              <MobileBottomNav />
            </Providers>
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
