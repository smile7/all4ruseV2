import { revalidatePath } from "next/cache";

import { LOCALES } from "~/constants";
import { hostIndexUrl, submitIndexNow } from "~/lib/indexnow";
import { hostPath } from "~/lib/seo";
import { normalizeWebUrl } from "~/lib/url-input";
import type { HostInput } from "~/types";

/** Empty strings from the form must land in the database as null, not "". */
function nullify(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Slug is deliberately left out: it is set once on create and never changes. */
export function buildHostFields(values: HostInput) {
  return {
    name: values.name.trim(),
    place: nullify(values.place),
    address: nullify(values.address),
    website: normalizeWebUrl(values.website),
    phone: nullify(values.phone),
    email: nullify(values.email)?.toLowerCase() ?? null,
  };
}

/**
 * Host pages are cached for a day. `eventPages` purges every event detail page
 * at once — only needed when a host is deleted, since its „Виж организатор“
 * links would otherwise point at a 404 until the cache expires.
 */
export function revalidateHosts(
  slugs: string[],
  options: { eventPages?: boolean } = {},
) {
  for (const slug of new Set(slugs)) {
    for (const locale of LOCALES) {
      revalidatePath(`/${locale}${hostPath(slug)}`);
    }
  }
  if (options.eventPages) {
    revalidatePath("/[locale]/[slug]", "page");
  }
  revalidatePath("/sitemap.xml");
}

/** Best-effort: the cache is already busted, IndexNow only speeds up Bing & co. */
export async function notifyHostsIndexNow(slugs: string[]) {
  try {
    await submitIndexNow(slugs.map(hostIndexUrl));
  } catch (error) {
    console.error("[hosts] IndexNow failed:", error);
  }
}
