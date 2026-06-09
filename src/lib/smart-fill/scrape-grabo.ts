import * as cheerio from "cheerio";

import type { EventDraft } from "~/types";

const BASE_URL = "grabo.bg";

export function isGraboUrl(url: string): boolean {
  return url.includes(BASE_URL);
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

export async function scrapeGrabo(
  url: string,
): Promise<{ draft: Omit<EventDraft, "image">; rawImageUrl: string | null }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; All4Ruse/2.0; +https://all4ruse.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const draft = extractDraft($, url);
  const rawImageUrl = ogImage($);

  return { draft, rawImageUrl };
}

// ─── Extraction ───────────────────────────────────────────────────────────────

function extractDraft(
  $: cheerio.CheerioAPI,
  pageUrl: string,
): Omit<EventDraft, "image"> {
  const draft: Omit<EventDraft, "image"> = {};

  // ── Title ────────────────────────────────────────────────────────────────
  // Grabo wraps the deal title in <h1> inside the main content or the page
  // <title> tag (formatted as "Deal name | Grabo.bg City")
  const h1 = $("h1").first().text().trim();
  if (h1) {
    draft.title = h1;
  } else {
    const pageTitle = ($("title").text().split("|")[0] ?? "").trim();
    if (pageTitle) draft.title = pageTitle;
  }

  // ── Date & time ───────────────────────────────────────────────────────────
  // "Валидност на ваучера: **22 Юни 2026 (Понеделник).**"
  // Also look in the body text for "22 Юни от 19:00ч"
  const bodyText = $("body").text();

  const validityMatch =
    /Валидност[^:]*:\s*([1-3]?\d)\s+([\wА-Яа-яЁёЪъЬьЮюЯяЄєІіЇї]+)\s+(\d{4})/i.exec(
      bodyText,
    );
  if (validityMatch) {
    const day = validityMatch[1] ?? "";
    const monthRaw = validityMatch[2] ?? "";
    const year = validityMatch[3] ?? "";
    const isoDate = parseBgDate(day, monthRaw, year);
    if (isoDate) {
      draft.startDate = isoDate;
      draft.endDate = isoDate;
    }
  }

  // Time — look for patterns like "19:00ч", "от 19:00", "19:00 часа"
  const timeMatch =
    /(?:от\s*|@\s*)?(\d{2}:\d{2})(?:ч|ч\.|часа| ч)?/i.exec(bodyText);
  if (timeMatch) {
    draft.startTime = timeMatch[1];
  }

  // ── Price — extract min–max from the offer variants table ────────────────
  // Grabo renders a table with header "Варианти на офертата:" followed by rows:
  //   "Място в зелена зона | 12.00 €/23.47 лв | Грабни"
  // We find that specific table by its header text, then read only those rows.
  const prices: number[] = [];

  // Find the table that contains the "Варианти" header
  let variantsTable = $("table").filter((_, el) => {
    return $(el).text().includes("Варианти");
  }).first();

  // If not found via table element, try common grabo class names
  if (!variantsTable.length) {
    variantsTable = $("[class*='variant'], [class*='Variant'], [class*='offer']")
      .filter((_, el) => $(el).text().includes("€"))
      .first();
  }

  if (variantsTable.length) {
    variantsTable.find("tr").each((_, row) => {
      // Each price cell looks like "12.00 €/23.47 лв" — take only the € value
      const match = /(\d+(?:\.\d+)?)\s*€/.exec($(row).text());
      if (match) {
        const val = parseFloat(match[1] ?? "0");
        if (val > 0 && val < 10000) prices.push(val);
      }
    });
  }

  // Fallback: look for the "Варианти на офертата:" block in body text and
  // extract only the prices that appear before "Условия на офертата:"
  if (prices.length === 0) {
    const variantsStart = bodyText.indexOf("Варианти");
    const variantsEnd = bodyText.indexOf("Условия на офертата");
    const variantsBlock =
      variantsStart !== -1 && variantsEnd > variantsStart
        ? bodyText.slice(variantsStart, variantsEnd)
        : "";

    const source = variantsBlock || bodyText.slice(0, 3000);
    const allPrices = [...source.matchAll(/(\d+(?:\.\d+)?)\s*€/g)];
    for (const m of allPrices) {
      const val = parseFloat(m[1] ?? "0");
      if (val > 0 && val < 1000) prices.push(val);
    }
  }

  if (prices.length > 0) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    draft.price = min === max ? `${min} €` : `${min}–${max} €`;
  }

  // ── Place & address ───────────────────────────────────────────────────────
  // Grabo shows: "Русе, Доходно здание" in the address/contacts section
  // We split: first part = town, rest = place name
  const addrEl = $("[class*='address'], [class*='venue'], [class*='location']")
    .first()
    .text()
    .trim();

  if (addrEl) {
    const parts = addrEl.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      draft.town = parts[0];
      draft.place = parts.slice(1).join(", ");
    } else {
      draft.place = addrEl;
    }
  } else {
    // Fallback: look for "Русе, [VenueName]" pattern in body text
    const venueMatch =
      /(?:Русе|Ruse)[,\s]+([А-Яа-яA-Za-z][^\n]{3,60})/i.exec(bodyText);
    if (venueMatch?.[1]) {
      draft.town = "Русе";
      draft.place = venueMatch[1].trim();
    } else {
      draft.town = "Русе";
    }
  }

  // ── Description ───────────────────────────────────────────────────────────
  // Grabo main description is in a div with "За концерта" / "За събитието" heading
  // or in a generic description container
  let descText = "";
  $("[class*='description'], [class*='details'], .offerText, .eventDescription").each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > descText.length) descText = t;
  });

  // Fallback: find the text block after "За концерта" / "За събитието" heading
  if (descText.length < 50) {
    $("h2, h3, strong").each((_, el) => {
      const heading = $(el).text().trim().toLowerCase();
      if (heading.startsWith("за ") || heading.includes("описание")) {
        const sibling = $(el).next();
        const t = sibling.text().trim();
        if (t.length > 50) { descText = t; return false; }
      }
    });
  }

  if (descText.length > 50) {
    draft.description = richTextToHtml(descText);
  }

  // ── Organizer — "Осигурено от [Name]" section ─────────────────────────────
  $("h2, h3, strong, [class*='provider'], [class*='organizer']").each((_, el) => {
    const text = $(el).text().trim();
    // Match "Осигурено от СТЕЙДЖ ХЪБ" pattern
    const m = /осигурено\s+от\s+(.+)/iu.exec(text);
    if (m?.[1]) {
      draft.organizer = m[1].trim();
      return false;
    }
    // Or a dedicated provider element
    if (
      $(el).hasClass("provider") ||
      $(el).attr("class")?.includes("organizer") ||
      $(el).attr("class")?.includes("provider")
    ) {
      const name = $(el).text().trim();
      if (name) { draft.organizer = name; return false; }
    }
  });

  // ── Tickets link — the grabo page URL itself is the ticket link ───────────
  draft.ticketsLink = pageUrl;

  return draft;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ogImage($: cheerio.CheerioAPI): string | null {
  return $('meta[property="og:image"]').attr("content") ?? null;
}

const BG_MONTHS: Record<string, string> = {
  януари: "01", февруари: "02", март: "03", април: "04",
  май: "05", юни: "06", юли: "07", август: "08",
  септември: "09", октомври: "10", ноември: "11", декември: "12",
};

function parseBgDate(
  day: string,
  monthRaw: string,
  year: string,
): string | null {
  const month = BG_MONTHS[monthRaw.toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

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
