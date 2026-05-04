import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { Footer, Header, MobileBottomNav } from "~/components/layout";
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
        {/*
          pb-16  — clears the mobile bottom nav bar (~56px + safe area)
          md:pb-10 — clears the fixed desktop footer (~40px)
        */}
        <main className="min-h-[calc(100svh-3.5rem)] pb-16 md:pb-10 xl:px-30">
          {children}
        </main>
        <Footer />
        <MobileBottomNav />
      </Providers>
    </NextIntlClientProvider>
  );
}
