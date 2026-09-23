import { FALLBACK_IMAGE } from "~/constants";
import {
  formatEventTitle,
  getEventImageUrl,
  getIntlLocale,
  parseLocalDate,
} from "~/lib/event-utils";

/**
 * Article event cards are stored as
 * `<p data-article-event="ID">…snapshot…</p>`. The snapshot only feeds the
 * editor; the public page re-renders every card from the live event row, so a
 * renamed, rescheduled or re-slugged event never leaves a stale card behind.
 */
export const ARTICLE_EVENT_ATTR = "data-article-event";

export type ArticleEventLinkSource = {
  id: number;
  slug: string | null;
  title: string;
  startDate: string;
  endDate: string;
  image: string | null;
};

const ARTICLE_EVENT_REGEX =
  /<p\b[^>]*\sdata-article-event="(\d+)"[^>]*>[\s\S]*?<\/p>/gi;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "18 октомври", "25–27 септември", "30 септември – 2 октомври". */
export function formatArticleEventDate(
  startDate: string,
  endDate: string,
  locale: string,
): string {
  const intlLocale = getIntlLocale(locale);
  const dayMonth = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "long",
  });
  const start = parseLocalDate(startDate);
  if (!endDate || endDate === startDate) return dayMonth.format(start);

  const end = parseLocalDate(endDate);
  // Every site locale writes day before month, so "25–" + "27 септември" reads right.
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return `${start.getDate()}–${dayMonth.format(end)}`;
  }
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
}

/** Widths must be in Next's default `images.imageSizes`, or the optimizer rejects them. */
function optimizedImageUrl(src: string, width: 128 | 256): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

/** Empty when the event has no usable poster; the "no image" placeholder adds nothing to a card. */
function buildThumbHtml(image: string | null): string {
  const src = getEventImageUrl(image);
  if (src === FALLBACK_IMAGE) return "";

  const small = escapeHtml(optimizedImageUrl(src, 128));
  const large = escapeHtml(optimizedImageUrl(src, 256));
  return `<span class="article-schedule-thumb"><img src="${small}" srcset="${small} 1x, ${large} 2x" alt="" loading="lazy" decoding="async"></span>`;
}

export function extractArticleEventIds(html: string): number[] {
  const ids = [...html.matchAll(ARTICLE_EVENT_REGEX)].map((match) =>
    Number(match[1]),
  );
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

/**
 * Swaps each stored placeholder for a schedule card built from the current
 * event. Cards whose event was deleted or deactivated are dropped rather than
 * left as an unlinked, possibly wrong, snapshot.
 */
export function renderArticleEventLinks(
  html: string,
  events: ArticleEventLinkSource[],
  locale: string,
): string {
  const byId = new Map(events.map((event) => [event.id, event]));

  return html.replace(ARTICLE_EVENT_REGEX, (_, rawId: string) => {
    const event = byId.get(Number(rawId));
    if (!event?.slug) return "";

    const href = `/${locale}/${encodeURIComponent(event.slug)}`;
    const date = escapeHtml(
      formatArticleEventDate(event.startDate, event.endDate, locale),
    );
    const title = escapeHtml(formatEventTitle(event.title));
    const thumb = buildThumbHtml(event.image);
    const classes = thumb
      ? "article-schedule-item article-schedule-linked article-schedule-has-thumb"
      : "article-schedule-item article-schedule-linked";
    return `<p class="${classes}"><a href="${href}" target="_blank" rel="noopener">${thumb}<span class="article-schedule-body"><span class="article-schedule-lead">${date}</span><span class="article-schedule-text">${title}</span></span></a></p>`;
  });
}
