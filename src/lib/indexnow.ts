import { DEFAULT_LOCALE } from "~/constants";

import "server-only";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

/**
 * Public IndexNow key. The matching file is served at `/{key}.txt` so Bing,
 * Yandex, Seznam and Naver can verify submissions. Google does not consume
 * IndexNow; it still helps the other engines pick up new events in minutes
 * instead of days (the WordPress Rank Math behaviour).
 */
export const INDEXNOW_KEY = "3032752c-af4e-4110-b224-5be2b46af53d";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS_PER_REQUEST = 100;

export function eventIndexUrl(slug: string): string {
  return `${SITE_URL}/${DEFAULT_LOCALE}/${slug}`;
}

function indexNowHost(): string {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "all4ruse.com";
  }
}

export async function submitIndexNow(urls: string[]): Promise<number> {
  const unique = [
    ...new Set(
      urls.filter((url) => {
        try {
          return new URL(url).host === indexNowHost();
        } catch {
          return false;
        }
      }),
    ),
  ].slice(0, MAX_URLS_PER_REQUEST);

  if (unique.length === 0) return 0;

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: indexNowHost(),
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: unique,
    }),
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`IndexNow ${response.status}`);
  }

  return unique.length;
}
