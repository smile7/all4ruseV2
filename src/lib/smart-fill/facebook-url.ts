/** Matches any Facebook URL that already points at a numeric event id. */
export const FB_EVENT_URL_RE = /facebook\.com\/events\/(\d+)/i;

export const FB_CRAWLER_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/**
 * Hosts we are willing to follow redirects through. Facebook share links
 * (fb.me/e/..., facebook.com/share/...) bounce through a few hops before
 * landing on the canonical event page.
 */
const RESOLVABLE_HOSTS = new Set([
  "fb.me",
  "www.fb.me",
  "fb.com",
  "www.fb.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
]);

const MAX_REDIRECTS = 6;

function parseUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function canonicalEventUrl(value: string): string | null {
  const eventId = FB_EVENT_URL_RE.exec(value)?.[1];
  return eventId ? `https://www.facebook.com/events/${eventId}/` : null;
}

function isResolvableHost(url: URL): boolean {
  return RESOLVABLE_HOSTS.has(url.hostname.toLowerCase());
}

/**
 * Normalises any supported Facebook event link into the canonical
 * `https://www.facebook.com/events/<id>/` form.
 *
 * Direct event URLs resolve without a network call; short links (fb.me/e/...)
 * and share links are resolved by following their redirect chain.
 *
 * Returns null when the input is not a Facebook event link we can resolve.
 */
export async function resolveFacebookEventUrl(
  input: string,
): Promise<string | null> {
  const direct = canonicalEventUrl(input);
  if (direct) return direct;

  const start = parseUrl(input);
  if (!start || !isResolvableHost(start)) return null;

  let current = start.toString();

  for (let hop = 0; hop < MAX_REDIRECTS; hop += 1) {
    let res: Response;
    try {
      res = await fetch(current, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": FB_CRAWLER_UA },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return null;
    }

    const location = res.headers.get("location");
    if (!location) return null;

    const next = parseUrl(new URL(location, current).toString());
    if (!next || !isResolvableHost(next)) return null;

    const resolved = canonicalEventUrl(next.toString());
    if (resolved) return resolved;

    current = next.toString();
  }

  return null;
}
