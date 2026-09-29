import { getTranslations } from "next-intl/server";

import { Typography } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";
import {
  eventPeriodPath,
  eventPeriodSlugs,
  resolveEventPeriod,
  TODAY_SLUG,
  WEEKEND_SLUG,
} from "~/lib/event-periods";
import { formatEventMonthHeading, parseLocalDate } from "~/lib/event-utils";

type Props = {
  locale: string;
  /** Omitted from the list so a page never links to itself. */
  currentSlug?: string;
  heading: string;
};

/**
 * Server-rendered links to the date landing pages. Without these the pages exist
 * only in the sitemap, and a sitemap-only URL gets crawled but carries no
 * internal link equity.
 */
export async function EventPeriodNav({ locale, currentSlug, heading }: Props) {
  const t = await getTranslations({ locale, namespace: "EventPeriodPage" });

  const links = eventPeriodSlugs()
    .filter((slug) => slug !== currentSlug)
    .flatMap((slug) => {
      const period = resolveEventPeriod(slug);
      if (!period) return [];

      if (slug === TODAY_SLUG) return [{ slug, label: t("navToday") }];
      if (slug === WEEKEND_SLUG) return [{ slug, label: t("navWeekend") }];

      const anchor = `${slug}-01`;
      const month = formatEventMonthHeading(anchor, locale);
      return [
        {
          slug,
          label: `${month} ${parseLocalDate(anchor).getFullYear()}`,
        },
      ];
    });

  if (links.length === 0) return null;

  return (
    <nav aria-label={heading} className="mt-12">
      <Typography.H2 className="mb-3 text-base">{heading}</Typography.H2>
      <div className="flex flex-wrap justify-center gap-2">
        {links.map(({ slug, label }) => (
          <Button key={slug} asChild variant="outline" size="sm">
            <Link href={eventPeriodPath(slug)}>{label}</Link>
          </Button>
        ))}
      </div>
    </nav>
  );
}
