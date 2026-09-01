import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { buildAlternates } from "~/lib/seo";

import HomePage from "../page";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("HomePage"),
    getLocale(),
  ]);

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    // Poster QR landing — keep it out of search, canonical is the real homepage.
    robots: "noindex, follow",
    alternates: buildAlternates(locale),
  };
}

export default HomePage;
