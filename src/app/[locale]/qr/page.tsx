import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import HomePage from "../page";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    // Poster QR landing. noindex only — a canonical pointing at the homepage
    // would let Google consolidate the two and treat the homepage as noindex.
    robots: { index: false, follow: true },
  };
}

export default HomePage;
