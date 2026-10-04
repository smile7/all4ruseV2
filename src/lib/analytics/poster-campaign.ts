const POSTER_SOURCE = "poster";
const POSTER_MEDIUM = "qr";

/** Place slug from the printed poster URL. Max keeps `poster.<slug>` within click_counts' 80-char key. */
const CAMPAIGN_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}-]{0,40}$/u;

export function normalizePosterCampaign(raw: string): string | null {
  const slug = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (!CAMPAIGN_PATTERN.test(slug)) return null;
  return slug;
}

/**
 * Reads the poster place from a URL that was printed as
 * `?utm_source=poster&utm_medium=qr&utm_campaign=<place>`.
 * Other campaigns (embeds, ads) are ignored.
 */
export function posterCampaignFromSearch(search: string): string | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  if (params.get("utm_source")?.trim().toLowerCase() !== POSTER_SOURCE) {
    return null;
  }
  if (params.get("utm_medium")?.trim().toLowerCase() !== POSTER_MEDIUM) {
    return null;
  }
  const campaign = params.get("utm_campaign");
  if (!campaign) return null;
  return normalizePosterCampaign(campaign);
}

export function posterEventKey(campaign: string): string {
  return `poster.${campaign}`;
}
