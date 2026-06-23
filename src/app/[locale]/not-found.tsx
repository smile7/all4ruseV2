import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SearchX } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NotFound");
  return { title: t("title") };
}

export default async function NotFoundPage() {
  const t = await getTranslations("NotFound");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 text-center">
      {/* Big 404 */}
      <div className="relative select-none">
        <span className="text-muted-foreground/10 text-[12rem] font-extrabold leading-none tracking-tighter sm:text-[16rem]">
          {t("code")}
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <SearchX className="text-muted-foreground size-16 sm:size-20" aria-hidden />
        </div>
      </div>

      {/* Text */}
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-base">{t("description")}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">{t("events")}</Link>
        </Button>
      </div>
    </div>
  );
}
