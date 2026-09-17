const EMBED_UTM_MEDIUM = "iframe";
const EMBED_UTM_CAMPAIGN = "events_widget";
const PARTNER_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

export function parseEmbedPartner(
  raw: string | string[] | undefined,
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  if (!PARTNER_SLUG_PATTERN.test(slug)) return null;
  return slug;
}

export function withEmbedCampaignParams(
  href: string,
  partner: string | null,
): string {
  if (!partner) return href;
  const params = new URLSearchParams({
    utm_source: partner,
    utm_medium: EMBED_UTM_MEDIUM,
    utm_campaign: EMBED_UTM_CAMPAIGN,
  });
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${params.toString()}`;
}
