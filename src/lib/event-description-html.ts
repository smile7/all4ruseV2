import sanitizeHtml from "sanitize-html";

/** Shared block spacing (paragraphs, headings, lists) — must match editor + detail view. */
const EVENT_DESCRIPTION_SPACING_CLASSES =
  "[&>*:first-child]:mt-0 [&_blockquote]:border-l-2 [&_blockquote]:my-4 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_h2:first-child]:mt-0 [&_h2]:mb-2 [&_h2]:mt-6 [&_h3:first-child]:mt-0 [&_h3]:mb-2 [&_h3]:mt-5 [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p:last-child]:mb-0 [&_p]:mb-4 [&_p]:mt-0 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6";

/** Public event page: prose + media safety. */
export const EVENT_DESCRIPTION_BODY_CLASSES = `prose prose-sm dark:prose-invert max-w-none wrap-break-word [&_iframe]:max-w-full [&_iframe]:w-full [&_img]:h-auto [&_img]:max-w-full [&_video]:h-auto [&_video]:max-w-full ${EVENT_DESCRIPTION_SPACING_CLASSES}`;

/** TipTap editable surface (no `prose` — avoids odd caret/selection behavior). */
export const EVENT_DESCRIPTION_EDITOR_INNER_CLASSES = `min-h-[220px] px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring ${EVENT_DESCRIPTION_SPACING_CLASSES}`;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
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
    "ul",
    "ol",
    "li",
    "blockquote",
    "span",
    "div",
  ],
  allowedAttributes: {
    p: ["style"],
    h2: ["style"],
    h3: ["style"],
    li: ["style"],
    span: ["style"],
    div: ["style"],
    ul: ["style"],
    ol: ["style"],
    blockquote: ["style"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^left$/i, /^center$/i, /^right$/i, /^justify$/i],
    },
  },
};

export function sanitizeEventDescription(html: string): string {
  return sanitizeHtml(html.trim(), SANITIZE_OPTIONS).trim();
}

export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePlainForHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Legacy plain/plain-newline descriptions → HTML paragraphs for TipTap. */
export function normalizeDescriptionForEditor(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (
    /<\s*p[\s>]|<\s*\/\s*p\s*>|<\s*br\s*\/?>|<\s*div[\s>]|<\s*h[1-6][\s>]|<\s*ul[\s>]|<\s*ol[\s>]|<\s*blockquote[\s>]/i.test(
      t,
    )
  ) {
    return t;
  }
  return t
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((block) => {
      const escaped = escapePlainForHtml(block).replace(/\n/g, "<br>");
      return `<p>${escaped}</p>`;
    })
    .join("");
}
