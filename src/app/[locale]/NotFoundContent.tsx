"use client";

import { useTranslations } from "next-intl";

import { SearchX } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";

/**
 * Client component on purpose. `not-found.tsx` receives no route params, so a
 * server-side `getTranslations()` there would resolve the locale from request
 * headers — and that turns every on-demand render of an unknown event slug into
 * a 500 instead of a 404, because the surrounding route is statically rendered.
 * Reading the locale from the client provider keeps the copy translated and the
 * route static; it is still server-rendered into the initial HTML.
 */
export function NotFoundContent() {
  const t = useTranslations("NotFound");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 text-center">
      {/* Big 404 */}
      <div className="relative select-none">
        <span className="text-muted-foreground/10 text-[12rem] leading-none font-extrabold tracking-tighter sm:text-[16rem]">
          {t("code")}
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <SearchX
            className="text-muted-foreground size-16 sm:size-20"
            aria-hidden
          />
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
