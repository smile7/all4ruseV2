import * as cheerio from "cheerio";

import type { EventDraft } from "~/types";

const BASE_URL = "ruseonthedanube.com";

export function isRuseDanubeUrl(url: string): boolean {
  return url.includes(BASE_URL);
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

export async function scrapeRuseDanube(
  url: string,
): Promise<{ draft: Omit<EventDraft, "image">; rawImageUrl: string | null }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; All4Ruse/2.0; +https://all4ruse.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const rawImageUrl = ogImage($);

  // Try JSON-LD first, then fill in the gaps with the HTML pass.
  // JSON-LD wins for dates/times/address; HTML pass fills organizer, categories,
  // links, and acts as a complete fallback when JSON-LD is absent.
  const fromJsonLd = tryJsonLd($) ?? {};
  const fromHtml = htmlPass($, url);

  const draft: Omit<EventDraft, "image"> = {
    ...fromHtml,
    ...fromJsonLd,
    // These fields only come from the HTML pass — JSON-LD never includes them
    organizer: fromHtml.organizer,
    suggestedTagNames: fromHtml.suggestedTagNames,
    // Prefer HTML-sourced links (more reliable on this site)
    fbLink: fromHtml.fbLink ?? fromJsonLd.fbLink,
    ticketsLink: fromHtml.ticketsLink ?? fromJsonLd.ticketsLink,
  };

  // On ruseonthedanube the "Място" / JSON-LD location.name is just the address
  // string, not a venue name. The actual venue IS the organizer
  // (e.g. "Happy Clever Kids"), so always use the organizer as the place.
  if (draft.organizer) {
    draft.place = draft.organizer;
  }

  return { draft, rawImageUrl };
}

// ─── JSON-LD extraction ───────────────────────────────────────────────────────

type SchemaEvent = {
  "@type"?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
    };
  };
  image?: string | string[];
  url?: string;
  offers?: { url?: string } | Array<{ url?: string }>;
};

function tryJsonLd(
  $: cheerio.CheerioAPI,
): Omit<EventDraft, "image"> | null {
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const el of scripts) {
    try {
      const raw = $(el).html() ?? "";
      const parsed: unknown = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (
          item &&
          typeof item === "object" &&
          "@type" in item &&
          (item as SchemaEvent)["@type"] === "Event"
        ) {
          return mapSchemaEvent(item as SchemaEvent);
        }
      }
    } catch {
      /* malformed — skip */
    }
  }
  return null;
}

function mapSchemaEvent(ev: SchemaEvent): Omit<EventDraft, "image"> {
  const draft: Omit<EventDraft, "image"> = {};

  if (ev.name) draft.title = ev.name.trim();
  if (ev.description) draft.description = richTextToHtml(ev.description.trim());

  if (ev.startDate) {
    draft.startDate = ev.startDate.slice(0, 10);
    const t = extractTimeFromIso(ev.startDate);
    if (t) draft.startTime = t;
  }
  if (ev.endDate) {
    draft.endDate = ev.endDate.slice(0, 10);
    const t = extractTimeFromIso(ev.endDate);
    if (t) draft.endTime = t;
  }

  if (ev.location) {
    if (ev.location.name) draft.place = ev.location.name.trim();
    if (ev.location.address?.streetAddress)
      draft.address = cleanAddress(ev.location.address.streetAddress.trim());
    if (ev.location.address?.addressLocality)
      draft.town = ev.location.address.addressLocality.trim();
  }

  const offersUrl = Array.isArray(ev.offers)
    ? ev.offers[0]?.url
    : ev.offers?.url;
  if (offersUrl) draft.ticketsLink = offersUrl;

  if (ev.url?.includes("facebook.com")) draft.fbLink = ev.url;

  return draft;
}

// ─── HTML pass ────────────────────────────────────────────────────────────────

function htmlPass(
  $: cheerio.CheerioAPI,
  pageUrl: string,
): Omit<EventDraft, "image"> {
  const draft: Omit<EventDraft, "image"> = {};

  // Title
  const title = $("h1").first().text().trim();
  if (title) draft.title = title;

  // ── Dates & times ─────────────────────────────────────────────────────────
  // Strategy A: scan every h2 for the BG date pattern "10 юни @ 18:00"
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (hasBgDatePattern(text)) {
      Object.assign(draft, parseBulgarianDateHeading(text));
      return false; // found — stop
    }
  });

  // Strategy B: scan "Дата:" / "Час:" labelled items anywhere in the page
  if (!draft.startDate) {
    const allText = $("li, dd, td, .tribe-meta-value").map((_, el) =>
      $(el).text().trim(),
    ).get();

    for (const text of allText) {
      // "Дата:  10 юни" or "Дата: 10 юни 2026"
      const dateLabel =
        /^(?:Дата|Date)[:\s]+(\d{1,2})\s+([а-яА-Я]+)(?:\s+(\d{4}))?/iu.exec(text);
      if (dateLabel) {
        const day = dateLabel[1] ?? "";
        const month = dateLabel[2] ?? "";
        const year = dateLabel[3];
        const d = year
          ? `${year}-${BG_MONTHS[month.toLowerCase()] ?? "01"}-${day.padStart(2, "0")}`
          : parseBulgarianDate(day, month);
        draft.startDate = d;
        draft.endDate = d;
      }

      // "Час:  10:00 - 11:00" or just two times separated by dash
      const timeLabel =
        /^(?:Час|Time|Hour)[:\s]+(\d{2}:\d{2})(?:\s*[-–]\s*(\d{2}:\d{2}))?/iu.exec(text);
      if (timeLabel) {
        if (!draft.startTime) draft.startTime = timeLabel[1];
        if (timeLabel[2] && !draft.endTime) draft.endTime = timeLabel[2];
      }
    }
  }

  // ── Address ───────────────────────────────────────────────────────────────
  // Try tribe classes first, then look at "Място" section text
  let rawAddress =
    $(".tribe-street-address").first().text().trim() ||
    $(".tribe-venue-location").first().text().trim();

  if (!rawAddress) {
    // Look for location/venue section in page — "Место" or "Място"
    $("h2, h3, strong").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text === "място" || text === "место" || text === "location" || text === "venue") {
        // Grab next sibling list item or text
        const next = $(el).next();
        const candidate = next.find("li").first().text().trim() || next.text().trim();
        if (candidate && candidate.length > 3) {
          rawAddress = candidate;
          return false;
        }
        // Also check parent's next sibling
        const parentNext = $(el).parent().next();
        const candidate2 = parentNext.find("li").first().text().trim() || parentNext.text().trim();
        if (candidate2 && candidate2.length > 3) {
          rawAddress = candidate2;
          return false;
        }
      }
    });
  }

  if (rawAddress) {
    draft.address = cleanAddress(rawAddress);
    draft.town = "Русе";
  }

  // ── Description ───────────────────────────────────────────────────────────
  const descHtml = $(
    ".tribe-events-single-section--description, .tribe-events-content, .tribe-events-single-section",
  )
    .first()
    .html()
    ?.trim();
  if (descHtml) draft.description = sanitizeDescriptionHtml(descHtml);

  // ── Organizer ─────────────────────────────────────────────────────────────
  // Try tribe class first
  let organizer =
    $(".tribe-organizer-title, .tribe-organizer a").first().text().trim();

  if (!organizer) {
    // Scan for "Организатор" heading then grab sibling/child text
    $("h2, h3, dt, strong, li").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text === "организатор" || text === "organizer") {
        const next = $(el).next();
        const candidate = next.find("li").first().text().trim() || next.text().trim();
        if (candidate) { organizer = candidate; return false; }
        const parentNext = $(el).parent().next();
        const candidate2 = parentNext.find("li").first().text().trim() || parentNext.text().trim();
        if (candidate2) { organizer = candidate2; return false; }
      }
    });
  }

  if (!organizer) {
    // Last resort: look for a list item immediately after "Организатор" heading
    const bodyText = $("body").text();
    const m = /Организатор\s*\n\s*([^\n]+)/.exec(bodyText);
    if (m?.[1]) organizer = m[1].trim();
  }

  if (organizer) draft.organizer = organizer;

  // ── Categories → suggestedTagNames ────────────────────────────────────────
  const categories: string[] = [];
  $(".tribe-event-categories a, [class*='category'] a").each((_, el) => {
    const cat = $(el).text().trim();
    if (cat) categories.push(cat);
  });

  if (categories.length === 0) {
    // Scan "Категория за Събитие:" label
    $("li, dd, td").each((_, el) => {
      const text = $(el).text().trim();
      const catMatch = /Категория[^:]*:\s*(.+)/i.exec(text);
      if (catMatch?.[1]) {
        categories.push(...catMatch[1].split(",").map((s) => s.trim()).filter(Boolean));
        return false;
      }
    });
  }

  if (categories.length > 0) draft.suggestedTagNames = categories;

  // ── Facebook event link ───────────────────────────────────────────────────
  $("a[href*='facebook.com/events']").each((_, el) => {
    draft.fbLink = $(el).attr("href") ?? "";
    return false;
  });

  // ── Ticket link ───────────────────────────────────────────────────────────
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim().toLowerCase();
    if (
      !draft.ticketsLink &&
      (text.includes("билет") || text.includes("ticket") || href.includes("entase")) &&
      !href.includes("facebook") &&
      href.startsWith("http") &&
      !href.includes(pageUrl)
    ) {
      draft.ticketsLink = href;
    }
  });

  return draft;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ogImage($: cheerio.CheerioAPI): string | null {
  return $('meta[property="og:image"]').attr("content") ?? null;
}

function extractTimeFromIso(iso: string): string | undefined {
  const m = /T(\d{2}:\d{2})/.exec(iso);
  return m ? m[1] : undefined;
}

const BG_MONTHS: Record<string, string> = {
  януари: "01", февруари: "02", март: "03", април: "04",
  май: "05", юни: "06", юли: "07", август: "08",
  септември: "09", октомври: "10", ноември: "11", декември: "12",
};

const BG_MONTH_RE = new RegExp(Object.keys(BG_MONTHS).join("|"), "iu");

function hasBgDatePattern(text: string): boolean {
  return BG_MONTH_RE.test(text) && /\d{1,2}/.test(text);
}

function parseBulgarianDate(dayStr: string, monthStr: string): string {
  const year = new Date().getFullYear();
  const month = BG_MONTHS[monthStr.toLowerCase()] ?? "01";
  const day = dayStr.padStart(2, "0");
  const candidate = `${year}-${month}-${day}`;
  const date = new Date(candidate);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  if (date < twoWeeksAgo) return `${year + 1}-${month}-${day}`;
  return candidate;
}

/** Parses "10 юни @ 18:00 - 18:35" or "10-11 юни @ 18:00" */
function parseBulgarianDateHeading(
  text: string,
): Partial<Omit<EventDraft, "image">> {
  const result: Partial<Omit<EventDraft, "image">> = {};

  const dateMatch =
    /(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s+([а-яА-Я]+)/u.exec(text);
  if (dateMatch) {
    const day1 = dateMatch[1] ?? "";
    const day2 = dateMatch[2];
    const monthRaw = dateMatch[3] ?? "";
    result.startDate = parseBulgarianDate(day1, monthRaw);
    result.endDate = day2
      ? parseBulgarianDate(day2, monthRaw)
      : result.startDate;
  }

  const timeMatch =
    /@\s*(\d{2}:\d{2})(?:\s*[-–\-]\s*(\d{2}:\d{2}))?/.exec(text);
  if (timeMatch) {
    result.startTime = timeMatch[1];
    if (timeMatch[2]) result.endTime = timeMatch[2];
  }

  return result;
}

/**
 * Strips city/country suffixes appended by WP Events Calendar:
 * "Генерал Скобелев 36, Ruse, Bulgaria" → "Генерал Скобелев 36"
 */
function cleanAddress(address: string): string {
  return address
    .replace(/,?\s*(Ruse|Русе)\s*,?\s*Bulgaria\s*$/i, "")
    .replace(/,?\s*Bulgaria\s*$/i, "")
    .replace(/,?\s*(Ruse|Русе)\s*$/i, "")
    .trim();
}

/**
 * Converts plain text (JSON-LD descriptions) to TipTap-compatible HTML.
 * Single newlines → <p> (common on WP Events Calendar plain-text descriptions).
 */
function richTextToHtml(text: string): string {
  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/\n\n/.test(normalised)) {
    return normalised
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br>").trim()}</p>`)
      .filter((p) => p !== "<p></p>")
      .join("");
  }
  return normalised
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

/**
 * Takes inner HTML from the page and returns clean TipTap HTML.
 */
function sanitizeDescriptionHtml(html: string): string {
  const $ = cheerio.load(html, null, false);
  $("script, style, iframe").remove();
  $("*").removeAttr("class").removeAttr("id").removeAttr("style");
  const cleaned = $.html().trim();
  if (!cleaned) return "";
  if (!/<(p|div|h[1-6]|ul|ol|li|br)/i.test(cleaned)) {
    return richTextToHtml(cleaned);
  }
  return cleaned;
}
