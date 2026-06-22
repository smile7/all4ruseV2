import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { WifiOff } from "lucide-react";

import { Button } from "~/components/ui/button";

import { RetryButton } from "./RetryButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Offline");
  return { title: t("title") };
}

export default async function OfflinePage() {
  const t = await getTranslations("Offline");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <WifiOff className="text-muted-foreground size-16" aria-hidden />
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground max-w-sm text-base">{t("description")}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <RetryButton label={t("retry")} />
        <Button variant="outline" asChild>
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}
