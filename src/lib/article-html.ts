import sanitizeHtml from "sanitize-html";

import { plainTextFromHtml } from "~/lib/event-description-html";
import { transliterateCyrillicToLatin } from "~/lib/transliterate-cyrillic";

/**
 * Shared spacing for blocks that are not restyled in globals.css
 * (`.article-body` headings and lists). Must match editor + public body.
 */
const ARTICLE_SPACING_CLASSES =
  "[&>*:first-child]:mt-0 [&_blockquote]:border-l-2 [&_blockquote]:my-6 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground [&_figure]:my-6 [&_p:last-child]:mb-0 [&_p]:mb-5 [&_p]:mt-0";

/** Public article body: prose + media safety. Headings/lists: see `.article-body` in globals.css. */
export const ARTICLE_BODY_CLASSES = `article-body prose prose-base dark:prose-invert max-w-none wrap-break-word [&_a]:underline [&_a]:underline-offset-2 [&_a.article-lightbox]:no-underline [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg ${ARTICLE_SPACING_CLASSES}`;

/** TipTap editable surface (no `prose` — avoids odd caret/selection behavior). */
export const ARTICLE_EDITOR_INNER_CLASSES = `article-body min-h-[420px] px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring ${ARTICLE_SPACING_CLASSES}`;

const WORDS_PER_MINUTE = 200;

/**
 * Article bodies are written only by the admin, so the allowlist is wider than
 * the one for event descriptions (which accept input from any authenticated
 * user). Do not widen the event allowlist to match this one.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "figure",
  "figcaption",
  "hr",
  "span",
  "div",
];

/**
 * Images may only be served from our own Supabase storage. Hotlinked images
 * break layout when the source disappears, leak visitor IPs to third parties,
 * and are outside our control for LCP.
 */
function isAllowedImageSrc(src: string | undefined): boolean {
  if (!src) return false;
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!storageUrl) return false;

  try {
    return new URL(src).host === new URL(storageUrl).host;
  } catch {
    return false;
  }
}

function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  return /^https?:\/\//i.test(href);
}

function buildSanitizeOptions(sponsored: boolean): sanitizeHtml.IOptions {
  return {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      img: ["src", "alt", "width", "height", "loading", "decoding"],
      // `id` survives sanitizing so the heading anchors added on write still
      // work after the body is sanitized again on read.
      h2: ["id", "style"],
      h3: ["id", "style"],
      h4: ["style"],
      p: ["style", "class"],
      li: ["style", "class"],
      span: ["style", "class"],
      div: ["style"],
      ul: ["style"],
      ol: ["style"],
      blockquote: ["style"],
      figure: ["style"],
      figcaption: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        "text-align": [/^left$/i, /^center$/i, /^right$/i, /^justify$/i],
      },
    },
    allowedClasses: {
      p: [
        "article-schedule-item",
        "article-schedule-linked",
        "article-section-kicker",
      ],
      li: ["article-schedule-item", "article-schedule-linked"],
      span: ["article-schedule-lead", "article-schedule-text"],
    },
    transformTags: {
      // The page title is the only <h1>; a second one muddies the outline.
      h1: "h2",
      a: (tagName, attribs) => {
        if (!isExternalHref(attribs.href)) {
          return { tagName, attribs };
        }
        return {
          tagName,
          attribs: {
            ...attribs,
            // `noreferrer` is deliberately omitted site-wide — see Phase 8.6.
            rel: sponsored ? "sponsored noopener" : "noopener",
          },
        };
      },
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: "lazy", decoding: "async" },
      }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === "img" && !isAllowedImageSrc(frame.attribs.src),
  };
}

export function sanitizeArticleHtml(
  html: string,
  options: { sponsored?: boolean } = {},
): string {
  return sanitizeHtml(
    html.trim(),
    buildSanitizeOptions(options.sponsored ?? false),
  ).trim();
}

function slugifyHeading(text: string): string {
  const base = transliterateCyrillicToLatin(
    text.normalize("NFKC").trim().toLowerCase(),
  )
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  return base || "section";
}

const HEADING_REGEX = /<(h2|h3)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;

/**
 * Assigns stable ids to h2/h3 at save time so the table of contents and deep
 * links work with zero client JS.
 */
export function addHeadingIds(html: string): string {
  const used = new Set<string>();

  return html.replace(HEADING_REGEX, (match, tag, rawAttrs, inner) => {
    const attrs: string = rawAttrs ?? "";
    const text = plainTextFromHtml(inner);

    let id = slugifyHeading(text);
    let suffix = 2;
    while (used.has(id)) {
      id = `${slugifyHeading(text)}-${suffix}`;
      suffix += 1;
    }
    used.add(id);

    const attrsWithoutId = attrs.replace(/\sid="[^"]*"/gi, "");
    return `<${tag}${attrsWithoutId} id="${id}">${inner}</${tag}>`;
  });
}

export type ArticleHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

/** Reads the ids added by `addHeadingIds` back out for the table of contents. */
export function extractArticleHeadings(html: string): ArticleHeading[] {
  const headings: ArticleHeading[] = [];

  for (const match of html.matchAll(HEADING_REGEX)) {
    const [, tag, rawAttrs, inner] = match;
    if (!tag) continue;

    const id = /\sid="([^"]*)"/i.exec(rawAttrs ?? "")?.[1];
    const text = plainTextFromHtml(inner ?? "");
    if (!id || !text) continue;

    headings.push({
      id,
      text,
      level: tag.toLowerCase() === "h2" ? 2 : 3,
    });
  }

  return headings;
}

export function estimateReadingMinutes(html: string): number {
  const words = plainTextFromHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

const SCHEDULE_LEAD_MAX_CHARS = 40;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&");
}

function isScheduleMarkupInner(inner: string): boolean {
  const stripped = inner
    .replace(/<\/?(?:p|br|a|strong|b|em|i|u|s|span)\b[^>]*>/gi, "")
    .trim();
  return !/<[a-z]/i.test(stripped);
}

/** "14 септември", "8 октомври 2026", "8.10" — not an arbitrary phrase before a dash. */
function looksLikeDateLead(lead: string): boolean {
  return /^\d{1,2}(\s+\p{L}+(?:\s+\d{4})?|[./]\d{1,2}(?:[./]\d{2,4})?)$/u.test(
    lead.trim(),
  );
}

function isSectionKicker(text: string): boolean {
  const stripped = text
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length < 4 || stripped.length > 72) return false;

  const letters = stripped.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4) return false;

  const uppercase = letters.replace(/[^\p{Lu}]/gu, "");
  return uppercase.length / letters.length >= 0.7;
}

function unwrapAnchors(html: string): string {
  return html.replace(/<\/?a\b[^>]*>/gi, "");
}

function uniqueHrefs(html: string): string[] {
  return [
    ...new Set(
      [...html.matchAll(/\shref="([^"]*)"/gi)].map((match) => match[1] ?? ""),
    ),
  ].filter(Boolean);
}

function singleHref(html: string): string | null {
  const hrefs = uniqueHrefs(html);
  return hrefs.length === 1 ? (hrefs[0] ?? null) : null;
}

function stripWrappingP(inner: string): { pAttrs: string; html: string } {
  const wrapped = /^\s*<p(\s[^>]*)?>([\s\S]*)<\/p>\s*$/i.exec(inner);
  if (!wrapped) return { pAttrs: "", html: inner.trim() };
  return { pAttrs: wrapped[1] ?? "", html: (wrapped[2] ?? "").trim() };
}

function stripWrappingAnchor(html: string): string {
  const trimmed = html.trim();
  if (!/^<a\b/i.test(trimmed) || !/<\/a>$/i.test(trimmed)) return trimmed;
  if (uniqueHrefs(trimmed).length !== 1) return trimmed;

  const wrapped = /^<a\b[^>]*>([\s\S]*)<\/a>$/i.exec(trimmed);
  return wrapped ? (wrapped[1] ?? "").trim() : trimmed;
}

function splitScheduleHtml(
  html: string,
): { leadHtml: string; restHtml: string } | null {
  let inTag = false;

  for (let i = 0; i < html.length; i += 1) {
    const char = html[i];
    if (char === "<") inTag = true;
    if (inTag) {
      if (char === ">") inTag = false;
      continue;
    }

    const separator = html.slice(i).match(/^\s+[-–—−]\s+/);
    if (!separator) continue;

    const leadHtml = html.slice(0, i).trim();
    const restHtml = html.slice(i + separator[0].length).trim();
    const leadText = decodeHtmlEntities(plainTextFromHtml(leadHtml)).trim();
    const restText = decodeHtmlEntities(plainTextFromHtml(restHtml)).trim();
    if (!leadText || !restText || leadText.length > SCHEDULE_LEAD_MAX_CHARS) {
      continue;
    }

    return { leadHtml, restHtml };
  }

  return null;
}

function withNewTab(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (full, rawAttrs: string) => {
    let attrs = rawAttrs;
    if (!/\starget=/i.test(attrs)) {
      attrs += ` target="_blank"`;
    }
    if (!/\srel=/i.test(attrs)) {
      attrs += ` rel="noopener"`;
    }
    return `<a${attrs}>`;
  });
}

function buildScheduleContent(
  leadHtml: string,
  restHtml: string,
  href: string | null,
): string {
  const lead = `<span class="article-schedule-lead">${href ? unwrapAnchors(leadHtml) : leadHtml}</span>`;
  const rest = `<span class="article-schedule-text">${href ? unwrapAnchors(restHtml) : withNewTab(restHtml)}</span>`;
  if (!href) return `${lead}${rest}`;
  return `<a href="${href}" target="_blank" rel="noopener">${lead}${rest}</a>`;
}

function scheduleBlockClasses(href: string | null): string {
  return href
    ? "article-schedule-item article-schedule-linked"
    : "article-schedule-item";
}

function withClass(rawAttrs: string | undefined, className: string): string {
  const attrs = rawAttrs ?? "";
  if (/\sclass="/i.test(attrs)) {
    return attrs.replace(
      /\sclass="([^"]*)"/i,
      (_, existing: string) => ` class="${existing} ${className}"`,
    );
  }
  return `${attrs} class="${className}"`;
}

function isInsideOpenLi(html: string, offset: number): boolean {
  const before = html.slice(0, offset);
  return before.lastIndexOf("<li") > before.lastIndexOf("</li>");
}

function enhanceListItems(html: string): string {
  return html.replace(
    /<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi,
    (full, rawAttrs: string | undefined, inner: string) => {
      if (/<(?:ul|ol|li|img|figure)\b/i.test(inner)) return full;
      if (!isScheduleMarkupInner(inner)) return full;

      const { pAttrs, html: withoutP } = stripWrappingP(inner);
      const content = stripWrappingAnchor(withoutP);
      const split = splitScheduleHtml(content);
      if (!split) return full;

      const href = singleHref(inner);
      const enhanced = buildScheduleContent(split.leadHtml, split.restHtml, href);
      const liAttrs = withClass(rawAttrs, scheduleBlockClasses(href));

      if (/^\s*<p[\s>]/i.test(inner.trim())) {
        return `<li${liAttrs}><p${pAttrs}>${enhanced}</p></li>`;
      }
      return `<li${liAttrs}>${enhanced}</li>`;
    },
  );
}

function enhanceParagraphs(html: string): string {
  return html.replace(
    /<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi,
    (full, rawAttrs: string | undefined, inner: string, offset: number) => {
      if (isInsideOpenLi(html, offset)) return full;
      if (/\sclass="/i.test(rawAttrs ?? "")) return full;
      if (/<(?:ul|ol|li|img|figure|div)\b/i.test(inner)) return full;
      if (!isScheduleMarkupInner(inner)) return full;

      const content = stripWrappingAnchor(inner.trim());
      const text = decodeHtmlEntities(plainTextFromHtml(content)).trim();
      if (!text) return full;

      const split = splitScheduleHtml(content);
      if (split) {
        const leadText = decodeHtmlEntities(
          plainTextFromHtml(split.leadHtml),
        ).trim();
        if (looksLikeDateLead(leadText)) {
          const href = singleHref(inner);
          return `<p${withClass(rawAttrs, scheduleBlockClasses(href))}>${buildScheduleContent(split.leadHtml, split.restHtml, href)}</p>`;
        }
      }

      if (isSectionKicker(text)) {
        return `<p${withClass(rawAttrs, "article-section-kicker")}>${inner}</p>`;
      }

      return full;
    },
  );
}

function wrapArticleImagesForLightbox(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (imgTag, offset: number) => {
    const src = /\ssrc="([^"]*)"/i.exec(imgTag)?.[1];
    if (!src) return imgTag;

    const before = html.slice(0, offset);
    const openAnchors = before.match(/<a[\s>]/gi)?.length ?? 0;
    const closeAnchors = before.match(/<\/a>/gi)?.length ?? 0;
    if (openAnchors > closeAnchors) return imgTag;

    const alt = /\salt="([^"]*)"/i.exec(imgTag)?.[1];
    const aria = alt ? ` aria-label="${alt}"` : "";
    return `<a href="${src}" class="article-lightbox"${aria}>${imgTag}</a>`;
  });
}

/**
 * Public-article polish, applied after sanitizing:
 * - "8 октомври - спектакъл" lines become schedule cards
 * - a single link on that line makes the whole card clickable
 * - short ALL-CAPS lines (with optional emoji) become section subtitles
 * - standalone images wrap in lightbox links
 * Also restyles the same patterns when the author used a real list.
 */
export function enhanceArticleBodyHtml(html: string): string {
  return wrapArticleImagesForLightbox(
    openArticleLinksInNewTab(enhanceParagraphs(enhanceListItems(html))),
  );
}

function openArticleLinksInNewTab(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (full, rawAttrs: string) => {
    const href = /\shref="([^"]*)"/i.exec(rawAttrs)?.[1] ?? "";
    if (!href || href.startsWith("#")) return full;
    return withNewTab(full);
  });
}
