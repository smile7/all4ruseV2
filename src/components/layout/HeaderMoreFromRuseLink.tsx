"use client";

import { useTranslations } from "next-intl";

import { Gem } from "lucide-react";

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
        "h-9 min-h-9 rounded-full px-4 text-xs font-medium tracking-wider whitespace-nowrap uppercase",
        isMobile ? "w-full" : "w-max shrink-0 px-6",
      )}
    >
      {/* The article is BG-only, so always open the Bulgarian version. */}
      <TrackedLink
        eventKey="header.featured_article"
        href={href}
        locale="bg"
      >
        <Gem className="size-4" />
        {t("familyWeekendTitle")}
      </TrackedLink>
    </Button>
  );
}
