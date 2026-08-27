import type { EventDraft } from "~/types";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal shape we use from the Apify Facebook events actor response.
 * Field names reflect the actual actor output (apify/facebook-events-scraper and variants).
 */
type ApifyFacebookEventResult = {
  name?: string;
  description?: string;
  /** ISO 8601 UTC start datetime — use this for date/time extraction. */
  utcStartDate?: string;
  /** ISO 8601 UTC end datetime (some actor variants). */
  utcEndDate?: string;
  /** ISO 8601 end datetime (snake_case actor variants). */
  end_date?: string;
  /** Unix seconds end timestamp (snake_case actor variants). */
  end_timestamp?: number;
  /** Human-readable date/time line, sometimes includes an end-time range. */
  dateTimeSentence?: string;
  /** Display duration when FB shows one, e.g. "4 hr" or "2 days". */
  duration?: string | null;
  /**
   * Human-readable start time string, e.g. "Sat, 13 Jun at 20:30 EEST".
   * Not used for parsing — utcStartDate is preferred.
   */
  startTime?: string;
  /** Best-effort full address string from the event page. */
  address?: string;
  location?: {
    name?: string;
    /** Official Apify actor field for street address. */
    streetAddress?: string | null;
    /** Legacy / alternate actor field. */
    street?: string;
    city?: string | null;
    zip?: string;
  } | null;
  ticketsInfo?: {
    buyUrl?: string | null;
  } | null;
  /** Legacy camelCase ticket URL (not used by apify/facebook-events-scraper). */
  ticketUrl?: string;
  /** Snake_case ticket URL (community actors). */
  ticket_url?: string;
  /** Facebook sometimes returns null placeholders here. */
  externalLinks?: Array<string | null>;
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

// ─── Errors ───────────────────────────────────────────────────────────────────

/**
 * Thrown when Apify ran successfully but the dataset was empty.
 * Distinct from a hard actor failure — callers can decide whether to retry.
 */
export class EmptyDatasetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmptyDatasetError";
  }
}

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
 * When structured location is missing, tries to extract place/address from the 📍 line
 * that Facebook itself includes in many event descriptions.
 *
 * Handles format: "📍 Place Name, Street Address"
 */
function parseLocationFromDescription(desc: string): {
  place?: string;
  address?: string;
} {
  const match = /📍\s*([^,\n]+?)(?:,\s*([^\n]+))?(?:\n|$)/.exec(desc);
  if (!match) return {};
  return {
    place: match[1]?.trim() || undefined,
    address: match[2]?.trim() || undefined,
  };
}

/**
 * Strips city/postal/country suffixes from FB/Apify address strings:
 * "Улица Одрин 4, 7000 Русе, България" → "Улица Одрин 4"
 */
function cleanApifyAddress(address: string): string {
  return address
    .replace(/,?\s*\d{4}\s*(?:Русе|Ruse)\s*,?\s*(?:България|Bulgaria)\s*$/i, "")
    .replace(/,?\s*(?:Русе|Ruse)\s*,?\s*(?:България|Bulgaria)\s*$/i, "")
    .replace(/,?\s*(?:България|Bulgaria)\s*$/i, "")
    .replace(/,?\s*(?:Русе|Ruse)\s*$/i, "")
    .trim();
}

function extractTownFromAddress(address: string): string | undefined {
  const postalMatch = /,\s*\d{4}\s+(Русе|Ruse)\b/i.exec(address);
  if (postalMatch?.[1]) return postalMatch[1];

  const suffixMatch = /,\s*(Русе|Ruse)\s*,?\s*(?:България|Bulgaria)?\s*$/i.exec(
    address,
  );
  if (suffixMatch?.[1]) return suffixMatch[1];

  return undefined;
}

function pickTicketUrl(item: ApifyFacebookEventResult): string | undefined {
  const direct =
    item.ticketsInfo?.buyUrl?.trim() ||
    item.ticketUrl?.trim() ||
    item.ticket_url?.trim();
  if (direct) return direct;

  return item.externalLinks?.find(
    (url): url is string =>
      typeof url === "string" &&
      url.trim().length > 0 &&
      !url.toLowerCase().includes("facebook.com"),
  );
}

function mapLocationFields(
  item: ApifyFacebookEventResult,
): Pick<EventDraft, "address" | "town" | "place"> {
  const mapped: Pick<EventDraft, "address" | "town" | "place"> = {};

  if (item.location?.name) mapped.place = item.location.name.trim();
  if (item.location?.city) mapped.town = item.location.city.trim();

  const rawAddress =
    item.address?.trim() ||
    item.location?.streetAddress?.trim() ||
    item.location?.street?.trim();

  if (rawAddress) {
    mapped.address = cleanApifyAddress(rawAddress);
    if (!mapped.town) {
      const town = extractTownFromAddress(rawAddress);
      if (town) mapped.town = town;
    }
  }

  if (item.description && (!mapped.address || !mapped.place)) {
    const { place, address } = parseLocationFromDescription(item.description);
    if (!mapped.place && place) mapped.place = place;
    if (!mapped.address && address) {
      mapped.address = cleanApifyAddress(address);
    }
  }

  return mapped;
}

function utcIsoFromEndFields(
  item: ApifyFacebookEventResult,
): string | undefined {
  if (item.utcEndDate) return item.utcEndDate;
  if (item.end_date) return item.end_date;
  if (item.end_timestamp) {
    return new Date(item.end_timestamp * 1000).toISOString();
  }
  return undefined;
}

function addDurationToStart(
  utcStartIso: string,
  duration: string,
): { endDate: string; endTime: string } | null {
  const normalized = duration.trim().toLowerCase();
  const start = new Date(utcStartIso);
  if (Number.isNaN(start.getTime())) return null;

  const hourMatch =
    /^(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours|ч\.?|часа?)\b/.exec(normalized);
  if (hourMatch) {
    const end = new Date(
      start.getTime() + parseFloat(hourMatch[1]!) * 3_600_000,
    );
    return {
      endDate: utcToLocalDate(end.toISOString()),
      endTime: utcToLocalTime(end.toISOString()),
    };
  }

  const minuteMatch =
    /^(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes|мин\.?|минути?)\b/.exec(
      normalized,
    );
  if (minuteMatch) {
    const end = new Date(
      start.getTime() + parseFloat(minuteMatch[1]!) * 60_000,
    );
    return {
      endDate: utcToLocalDate(end.toISOString()),
      endTime: utcToLocalTime(end.toISOString()),
    };
  }

  const dayMatch = /^(\d+(?:\.\d+)?)\s*(?:day|days|д\.?|дни?)\b/.exec(
    normalized,
  );
  if (dayMatch) {
    const end = new Date(
      start.getTime() + parseFloat(dayMatch[1]!) * 86_400_000,
    );
    return {
      endDate: utcToLocalDate(end.toISOString()),
      endTime: utcToLocalTime(end.toISOString()),
    };
  }

  return null;
}

function parseFlexibleTimeTo24h(raw: string): string | null {
  const trimmed = raw.trim();
  const twentyFourHour = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (twentyFourHour) {
    return `${twentyFourHour[1]!.padStart(2, "0")}:${twentyFourHour[2]}`;
  }

  const twelveHour = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(trimmed);
  if (!twelveHour) return null;

  let hour = parseInt(twelveHour[1]!, 10);
  const minute = twelveHour[2] ?? "00";
  const meridiem = twelveHour[3]!.toUpperCase();

  if (meridiem === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

/**
 * Parses end time from FB date lines like:
 * "Monday, September 21, 2026 at 8:00 PM - 11:00 PM EEST"
 */
function parseEndFromDateTimeSentence(
  sentence: string,
  utcStartIso: string,
): { endDate: string; endTime: string } | null {
  const rangeMatch =
    /\bat\s+[\d:]+\s*(?:AM|PM|am|pm)?\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/i.exec(
      sentence,
    );
  if (!rangeMatch?.[1]) return null;

  const endTime = parseFlexibleTimeTo24h(rangeMatch[1].trim());
  if (!endTime) return null;

  const startDate = utcToLocalDate(utcStartIso);
  const startTime = utcToLocalTime(utcStartIso);
  let endDate = startDate;

  if (endTime < startTime) {
    const nextDay = new Date(`${startDate}T12:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    endDate = nextDay.toLocaleDateString("sv-SE", { timeZone: "Europe/Sofia" });
  }

  return { endDate, endTime };
}

function mapEndDateTime(
  item: ApifyFacebookEventResult,
): Pick<EventDraft, "endDate" | "endTime"> {
  const endUtcIso = utcIsoFromEndFields(item);
  if (endUtcIso) {
    return {
      endDate: utcToLocalDate(endUtcIso),
      endTime: utcToLocalTime(endUtcIso),
    };
  }

  if (item.utcStartDate && item.duration) {
    const fromDuration = addDurationToStart(item.utcStartDate, item.duration);
    if (fromDuration) return fromDuration;
  }

  if (item.utcStartDate && item.dateTimeSentence) {
    const fromSentence = parseEndFromDateTimeSentence(
      item.dateTimeSentence,
      item.utcStartDate,
    );
    if (fromSentence) return fromSentence;
  }

  return {};
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
    throw new Error(
      `Apify run failed: ${runRes.status} ${await runRes.text()}`,
    );
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
    console.error(
      "[apify] empty dataset for URL:",
      facebookUrl,
      "run:",
      runId,
      "status:",
      status,
      "raw:",
      JSON.stringify(items).slice(0, 500),
    );
    throw new EmptyDatasetError(
      "Apify returned no items — the event may be private, removed, or Facebook rate-limited this request.",
    );
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

  const endDateTime = mapEndDateTime(item);
  if (endDateTime.endDate) draft.endDate = endDateTime.endDate;
  if (endDateTime.endTime) draft.endTime = endDateTime.endTime;
  if (!draft.endDate && draft.startDate) draft.endDate = draft.startDate;

  Object.assign(draft, mapLocationFields(item));

  const ticketUrl = pickTicketUrl(item);
  if (ticketUrl) draft.ticketsLink = ticketUrl;
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
