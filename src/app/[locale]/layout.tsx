import { notFound } from "next/navigation";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { FiltersMobileDrawer, Footer, Header, MobileBottomNav } from "~/components/layout";
import Providers from "~/components/Providers";
import type { Locale } from "~/constants";
import { routing } from "~/i18n/routing";

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
      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          strategy="lazyOnload"
        />
      )}
    </NextIntlClientProvider>
  );
}
