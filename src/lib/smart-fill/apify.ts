import type { EventDraft } from "~/types";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal shape we use from the Apify Facebook events actor response.
 * Field names reflect the actual actor output (different from what was assumed).
 */
type ApifyFacebookEventResult = {
  name?: string;
  description?: string;
  /** ISO 8601 UTC start datetime — use this for date/time extraction. */
  utcStartDate?: string;
  /** ISO 8601 UTC end datetime. */
  utcEndDate?: string;
  /**
   * Human-readable start time string, e.g. "Sat, 13 Jun at 20:30 EEST".
   * Not used for parsing — utcStartDate is preferred.
   */
  startTime?: string;
  location?: {
    name?: string;
    street?: string;
    city?: string;
    zip?: string;
  } | null;
  ticketUrl?: string;
  url?: string;
  /** Top-level image URL — the field the actor actually populates. */
  imageUrl?: string;
  /** Legacy nested photo fields (not always present). */
  photo?: {
    imageUri?: string;
    uri?: string;
  };
  coverPhoto?: {
    photo?: {
      imageUri?: string;
    };
  };
  isOnline?: boolean;
  /** "Event by Organizer Name" — maps to EventDraft.organizer. */
  organizedBy?: string;
  organizators?: Array<{
    id?: string;
    url?: string;
    name?: string;
    isVerified?: boolean;
  }>;
};

type ApifyRunResponse = {
  status: string;
  id: string;
};

// The Apify dataset items endpoint returns a direct JSON array, not wrapped.
type ApifyDatasetItems = ApifyFacebookEventResult[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEnv() {
  const token = process.env.APIFY_TOKEN;
  const actorId =
    process.env.APIFY_FACEBOOK_EVENTS_ACTOR_ID ?? process.env.APIFY_ACTOR_ID;
  if (!token || !actorId) {
    throw new Error(
      "APIFY_TOKEN or APIFY_FACEBOOK_EVENTS_ACTOR_ID is not configured",
    );
  }
  return { token, actorId };
}

/** Converts a UTC ISO datetime string to YYYY-MM-DD in Europe/Sofia timezone. */
function utcToLocalDate(utcIso: string): string {
  return new Date(utcIso).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Sofia",
  });
}

/** Converts a UTC ISO datetime string to HH:MM (24-hour) in Europe/Sofia timezone. */
function utcToLocalTime(utcIso: string): string {
  return new Date(utcIso).toLocaleTimeString("en-GB", {
    timeZone: "Europe/Sofia",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function pickImageUrl(result: ApifyFacebookEventResult): string | undefined {
  return (
    result.imageUrl ??
    result.photo?.imageUri ??
    result.photo?.uri ??
    result.coverPhoto?.photo?.imageUri
  );
}

/**
 * When `location` is null, tries to extract place/address from the 📍 line
 * that Facebook itself includes in many event descriptions.
 *
 * Handles format: "📍 Place Name, Street Address"
 */
function parseLocationFromDescription(
  desc: string,
): { place?: string; address?: string } {
  const match = /📍\s*([^,\n]+?)(?:,\s*([^\n]+))?(?:\n|$)/.exec(desc);
  if (!match) return {};
  return {
    place: match[1]?.trim() || undefined,
    address: match[2]?.trim() || undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs the configured Apify Facebook events actor for the given URL and waits
 * for the result. Returns the raw image URL (caller is responsible for
 * re-uploading it to Supabase Storage).
 */
export async function scrapeApifyFacebookEvent(
  facebookUrl: string,
): Promise<{ draft: Omit<EventDraft, "image">; rawImageUrl: string | null }> {
  const { token, actorId } = getEnv();

  // Start the actor run — actor expects startUrls as plain strings, not objects
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${token}&waitForFinish=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [facebookUrl],
        maxItems: 1,
      }),
    },
  );

  if (!runRes.ok) {
    throw new Error(`Apify run failed: ${runRes.status} ${await runRes.text()}`);
  }

  const run = (await runRes.json()) as { data: ApifyRunResponse };
  const { id: runId, status } = run.data;

  if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
    throw new Error(`Apify actor run ended with status: ${status}`);
  }

  // Fetch items from the run's default dataset
  const dataRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=1`,
  );

  if (!dataRes.ok) {
    throw new Error(`Apify dataset fetch failed: ${dataRes.status}`);
  }

  // Dataset endpoint returns a direct JSON array
  const items = (await dataRes.json()) as ApifyDatasetItems;

  if (!Array.isArray(items) || items.length === 0) {
    console.error("[apify] dataset response:", JSON.stringify(items).slice(0, 500));
    throw new Error("Apify returned no items for this URL");
  }

  const item = items[0]!;

  const draft: Omit<EventDraft, "image"> = {};

  if (item.name) draft.title = item.name;
  if (item.description) draft.description = descriptionToHtml(item.description);

  // Date/time: use utcStartDate (ISO UTC) and convert to Europe/Sofia local time
  if (item.utcStartDate) {
    draft.startDate = utcToLocalDate(item.utcStartDate);
    draft.startTime = utcToLocalTime(item.utcStartDate);
  }
  if (item.utcEndDate) {
    draft.endDate = utcToLocalDate(item.utcEndDate);
    draft.endTime = utcToLocalTime(item.utcEndDate);
  }

  // Location: use structured field when available, otherwise parse from description
  if (item.location) {
    if (item.location.street) draft.address = item.location.street;
    if (item.location.city) draft.town = item.location.city;
    if (item.location.name) draft.place = item.location.name;
  } else if (item.description) {
    const { place, address } = parseLocationFromDescription(item.description);
    if (place) draft.place = place;
    if (address) draft.address = address;
  }

  if (item.ticketUrl) draft.ticketsLink = item.ticketUrl;
  if (item.url) draft.fbLink = item.url;

  // Hosts: prefer structured organizators[] (supports multiple co-hosts + FB links)
  const hosts = item.organizators?.filter((o) => o.name?.trim());
  if (hosts && hosts.length > 0) {
    draft.organizers = hosts.map((o) => ({
      name: o.name!.trim(),
      link: o.url?.trim() || undefined,
    }));
  } else if (item.organizedBy) {
    // Fallback when organizators is missing — strip the "Event by " prefix
    draft.organizer = item.organizedBy.replace(/^Event by\s+/i, "").trim();
  }

  return { draft, rawImageUrl: pickImageUrl(item) ?? null };
}

function descriptionToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>").trim()}</p>`)
    .filter((p) => p !== "<p></p>")
    .join("");
}
