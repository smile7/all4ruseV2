import { getMessages } from "next-intl/server";

import { EventTag } from "~/components/EventTag";
import { Typography } from "~/components/layout";
import { MIN_INDEXABLE_TAG_EVENTS } from "~/constants";
import { localizedEventTagTitle } from "~/i18n/event-tag-label";
import { eventTagSlug } from "~/lib/event-tag-slug";
import { formatEventTagDisplayLabel } from "~/lib/event-tag-styles";
import type { Event } from "~/types";

type Props = {
  /** Upcoming events already loaded by the page — the counts come from these. */
  events: Event[];
  locale: string;
  heading: string;
};

/**
 * Server-rendered links to the `/tag/*` hubs. Those hubs are the category
 * landing pages that rank for generic queries ("концерти в Русе"), but the only
 * other links to them sit on individual event pages, which leaves them
 * effectively orphaned. Rendering them here — not behind the client-side filter
 * bar — is what makes them crawlable.
 *
 * Counts are derived from `events` rather than a second query, and tags below
 * the indexable threshold are skipped so this never links to a noindex page.
 */
export async function EventTagHubNav({ events, locale, heading }: Props) {
  const countByTitle = new Map<string, number>();
  for (const event of events) {
    for (const tag of event.tags ?? []) {
      const title = tag.title?.trim();
      if (!title) continue;
      countByTitle.set(title, (countByTitle.get(title) ?? 0) + 1);
    }
  }

  const hubs = [...countByTitle.entries()]
    .filter(([, count]) => count >= MIN_INDEXABLE_TAG_EVENTS)
    .sort(([, a], [, b]) => b - a)
    .flatMap(([title, count]) => {
      const slug = eventTagSlug(title);
      return slug ? [{ title, slug, count }] : [];
    });

  if (hubs.length === 0) return null;

  const messages = await getMessages({ locale });
  const eventTagLabels = (messages as { EventTags?: Record<string, string> })
    .EventTags;

  return (
    <nav aria-label={heading} className="mt-12">
      <Typography.H2 className="mb-3 text-base">{heading}</Typography.H2>
      <div className="flex flex-wrap justify-center gap-2">
        {hubs.map(({ title, slug, count }) => (
          <EventTag
            key={slug}
            title={title}
            label={`${formatEventTagDisplayLabel(
              localizedEventTagTitle(title, eventTagLabels),
            )} (${count})`}
            size="md"
            href={`/tag/${slug}`}
          />
        ))}
      </div>
    </nav>
  );
}
