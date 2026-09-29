import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE } from "~/constants";

import { NotFoundContent } from "./NotFoundContent";

// Metadata cannot use the client provider, and an implicit locale here would
// read request headers. The page is noindex, so the default locale is enough.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: DEFAULT_LOCALE,
    namespace: "NotFound",
  });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function NotFoundPage() {
  return <NotFoundContent />;
}
