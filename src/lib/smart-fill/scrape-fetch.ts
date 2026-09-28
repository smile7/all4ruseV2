/**
 * Outbound fetching for the pages and images we scrape.
 *
 * Cloudflare in front of ruseonthedanube.com started returning 403 for our
 * requests: a crawler-style user agent coming from a datacenter IP scores as a
 * bot. These headers mimic a real Chrome navigation so the requests pass.
 */

import { FAILURE_MESSAGE_MAX_LENGTH } from "~/lib/failures";

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const CLIENT_HINTS = {
  "sec-ch-ua":
    '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
};

/** Headers for fetching an HTML page, as if the user navigated to it. */
const pageFetchHeaders: Record<string, string> = {
  "User-Agent": CHROME_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "bg-BG,bg;q=0.9,en-US;q=0.8,en;q=0.7",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  ...CLIENT_HINTS,
};

/**
 * Headers for fetching an image. The referer is set to the image's own origin
 * so hotlink protection sees a same-site request.
 */
export function imageFetchHeaders(sourceUrl: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": CHROME_UA,
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "bg-BG,bg;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "same-origin",
    ...CLIENT_HINTS,
  };

  try {
    headers.Referer = new URL(sourceUrl).origin + "/";
  } catch {
    /* not a parseable URL — send the request without a referer */
  }

  return headers;
}

/**
 * Fetches a page to scrape. On a rejected request the thrown message carries
 * enough detail to tell a bot-protection block apart from a real server error,
 * because it lands in `flow_failures` and is all we get to debug from.
 */
export async function fetchScrapeHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: pageFetchHeaders });

  if (!res.ok) {
    throw new Error(await describeRejection(res, url));
  }

  return res.text();
}

async function describeRejection(res: Response, url: string): Promise<string> {
  const parts = [`HTTP ${res.status} fetching ${url}`];

  // Cloudflare names itself in `server` and stamps every edge response with a
  // ray id; `cf-mitigated` appears when a bot rule (not the origin) rejected us.
  for (const header of ["server", "cf-ray", "cf-mitigated"]) {
    const value = res.headers.get(header);
    if (value) parts.push(`${header}=${value}`);
  }

  const reason = await blockPageReason(res);
  if (reason) parts.push(reason);

  return parts.join(" | ").slice(0, FAILURE_MESSAGE_MAX_LENGTH);
}

/**
 * Cloudflare block pages state why they blocked: a 1xxx error code (1020 is a
 * WAF rule, 1010/1015 are bot and rate limits) and a telling title such as
 * "Attention Required!" or "Just a moment..." for a JS challenge.
 */
async function blockPageReason(res: Response): Promise<string | null> {
  let body: string;
  try {
    body = (await res.text()).slice(0, 20_000);
  } catch {
    return null;
  }

  const code =
    /error code:\s*(\d{4})/i.exec(body)?.[1] ??
    /cf-error-code[^>]*>\s*(\d{4})/i.exec(body)?.[1] ??
    /\bError\s+(\d{4})\b/.exec(body)?.[1];
  const title = /<title[^>]*>([^<]+)<\/title>/i.exec(body)?.[1]?.trim();

  const details = [
    code ? `code=${code}` : null,
    title ? `title=${title.slice(0, 80)}` : null,
  ].filter((part) => part !== null);

  return details.length > 0 ? details.join(" ") : null;
}
