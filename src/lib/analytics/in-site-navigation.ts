export type PageLocation = {
  href: string;
  origin: string;
  pathname: string;
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * True when `href` opens a different page on this site.
 * Same-page jumps (table of contents) and off-site links do not count.
 */
export function isInSiteNavigation(href: string, page: PageLocation): boolean {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#")) return false;

  let url: URL;
  try {
    url = new URL(trimmed, page.href);
  } catch {
    return false;
  }

  if (url.origin !== page.origin) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  return normalizePath(url.pathname) !== normalizePath(page.pathname);
}
