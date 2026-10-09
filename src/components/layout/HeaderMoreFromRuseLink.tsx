"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { Gem } from "lucide-react";

import { TrackedLink } from "~/components/TrackedLink";
import { Button } from "~/components/ui/button";
import { usePathname } from "~/i18n/navigation";
import { FEATURED_HEADER_ARTICLE_SLUG } from "~/lib/articles/featured-header";
import { todayInSofia } from "~/lib/event-utils";
import { ARTICLES_PATH } from "~/lib/seo";
import { cn } from "~/lib/utils";

type Props = {
  variant?: "mobile" | "desktop";
  /** Last Sofia day the promo runs, YYYY-MM-DD. */
  expiresOn?: string | null;
};

const neverChanges = () => () => {};

/**
 * Header entry point to the featured article.
 * The parent only mounts this while that article's promo is on and unexpired.
 */
export function HeaderMoreFromRuseLink({
  variant = "desktop",
  expiresOn = null,
}: Props) {
  const t = useTranslations("HomePage");
  const pathname = usePathname();

  // The surrounding page is cached for a long ISR window, so the server render
  // can predate the expiry date. Re-check once hydrated, without desyncing the
  // server HTML.
  const hydrated = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
  const expired =
    hydrated && expiresOn !== null && expiresOn.slice(0, 10) < todayInSofia();

  const href = `${ARTICLES_PATH}/${FEATURED_HEADER_ARTICLE_SLUG}`;
  if (expired || pathname === href) return null;

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
      <TrackedLink eventKey="header.featured_article" href={href} locale="bg">
        <Gem className="size-4" />
        {t("familyWeekendTitle")}
      </TrackedLink>
    </Button>
  );
}
