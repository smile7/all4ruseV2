export const FB_EVENT_URL_RE = /facebook\.com\/events\/\d+/;

export type FacebookEventVisibility = "public" | "private" | "unknown";

export type FacebookEventVisibilityResult = {
  visibility: FacebookEventVisibility;
  title?: string;
};

const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const UNAVAILABLE_BODY_PATTERNS = [
  /content isn't available/i,
  /this content isn't available/i,
  /content not found/i,
  /page not found/i,
  /това съдържание не е налично/i,
];

const LOGIN_TITLE_PATTERNS = [
  /^log in\b/i,
  /^sign up\b/i,
  /^facebook$/i,
  /^влезте\b/i,
  /^войти\b/i,
  /^conectează\b/i,
  /^conecteaza\b/i,
  /log in or sign up/i,
  /log into facebook/i,
  /влезте в системата/i,
  /войдите в facebook/i,
  /conectează-te la facebook/i,
];

const PUBLIC_BODY_PATTERNS = [
  /PublicEventComet/i,
  /EventCometContextRowContentAttendancePublic/i,
];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaContent(
  html: string,
  property: string,
): string | undefined {
  const patterns = [
    new RegExp(
      `property="${property}"\\s+content="([^"]*)"|content="([^"]*)"\\s+property="${property}"`,
      "i",
    ),
    new RegExp(
      `name="${property}"\\s+content="([^"]*)"|content="([^"]*)"\\s+name="${property}"`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    const raw = match?.[1] ?? match?.[2];
    if (raw?.trim()) return decodeHtmlEntities(raw.trim());
  }

  return undefined;
}

function looksLikeLoginTitle(title: string | undefined): boolean {
  if (!title) return true;
  const normalized = title.trim();
  if (!normalized) return true;
  return LOGIN_TITLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Lightweight check for whether a Facebook event page is publicly visible
 * without running the full Apify scrape. Uses the same crawler-facing HTML
 * Facebook serves to search engines.
 */
export async function checkFacebookEventVisibility(
  facebookUrl: string,
): Promise<FacebookEventVisibilityResult> {
  const res = await fetch(facebookUrl, {
    headers: {
      "User-Agent": GOOGLEBOT_UA,
      Accept: "text/html",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });

  const finalUrl = res.url.toLowerCase();
  if (finalUrl.includes("/login") || finalUrl.includes("facebook.com/login")) {
    return { visibility: "private" };
  }

  const html = await res.text();

  if (
    !res.ok ||
    UNAVAILABLE_BODY_PATTERNS.some((pattern) => pattern.test(html))
  ) {
    return { visibility: "private" };
  }

  const title = extractMetaContent(html, "og:title");
  const description =
    extractMetaContent(html, "description") ??
    extractMetaContent(html, "og:description");

  if (PUBLIC_BODY_PATTERNS.some((pattern) => pattern.test(html))) {
    return {
      visibility: "public",
      title: looksLikeLoginTitle(title) ? undefined : title,
    };
  }

  if (looksLikeLoginTitle(title)) {
    return { visibility: "private" };
  }

  if (title && description) {
    return { visibility: "public", title };
  }

  return { visibility: "unknown" };
}
