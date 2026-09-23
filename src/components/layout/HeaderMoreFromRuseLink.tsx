"use client";

import { useTranslations } from "next-intl";

import { Newspaper } from "lucide-react";

import { TrackedLink } from "~/components/TrackedLink";
import { Button } from "~/components/ui/button";
import { usePathname } from "~/i18n/navigation";
import { ARTICLES_PATH } from "~/lib/seo";
import { cn } from "~/lib/utils";

const FEATURED_ARTICLE_SLUG = "kakvo-da-pravim-s-detsata-v-ruse-tozi-uikend";

type Props = {
  variant?: "mobile" | "desktop";
};

/** Header entry point to the currently featured article. */
export function HeaderMoreFromRuseLink({ variant = "desktop" }: Props) {
  const t = useTranslations("HomePage");
  const pathname = usePathname();

  const href = `${ARTICLES_PATH}/${FEATURED_ARTICLE_SLUG}`;
  if (pathname === href) return null;

  const isMobile = variant === "mobile";

  return (
    <Button
      asChild
      variant="default"
      className={cn(
        "h-auto justify-center rounded-full py-2 text-xs font-medium tracking-wider uppercase",
        isMobile ? "w-full px-4" : "px-8",
      )}
    >
      {/* The article is BG-only, so always open the Bulgarian version. */}
      <TrackedLink
        eventKey="header.featured_article"
        href={href}
        locale="bg"
      >
        <Newspaper className="size-4 shrink-0" />
        <span>{t("familyWeekendTitle")}</span>
      </TrackedLink>
    </Button>
  );
}
