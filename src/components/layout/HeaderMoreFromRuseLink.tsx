"use client";

import { useTranslations } from "next-intl";

import { Button } from "~/components/ui/button";
import { usePathname } from "~/i18n/navigation";
import { cn } from "~/lib/utils";

type Props = {
  variant?: "mobile" | "desktop";
};

/**
 * Header entry point to the articles section.
 * On mobile it only shows on the homepage — every other page already has it in
 * the bottom-nav "more" drawer, and an extra header row would eat scarce
 * vertical space.
 */
export function HeaderMoreFromRuseLink({ variant = "desktop" }: Props) {
  const t = useTranslations("HomePage");
  const pathname = usePathname();

  const isMobile = variant === "mobile";
  if (isMobile && pathname !== "/") return null;

  return (
    <Button
      asChild
      variant="default"
      className={cn(
        "h-auto justify-center rounded-full py-2 text-xs font-medium tracking-wider uppercase",
        isMobile ? "w-full px-4" : "px-8",
      )}
    >
      {/* TODO: uncomment when enought articles <Link href={ARTICLES_PATH}>
        <Newspaper className="size-4 shrink-0" />
        <span>{t("moreFromRuseTitle")}</span>
      </Link> */}
    </Button>
  );
}
