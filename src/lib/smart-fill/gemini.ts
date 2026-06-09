import { GoogleGenerativeAI } from "@google/generative-ai";

import type { EventDraft } from "~/types";

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an event detail extractor for an event listing website in Ruse, Bulgaria.

Extract event details from the provided input and return ONLY a valid JSON object — no markdown fences, no explanation, nothing else.

For the "description" field: write in Bulgarian, in an engaging and promotional style — like a Facebook event post that makes people excited to attend. Use a punchy opening sentence. Include key practical details (date, time, place, price if known) in a natural, readable way. Add 1–3 relevant emoji where they feel natural, not forced. End with a short call to action (e.g. "Очакваме ви! 🎉", "Не пропускайте!", "Елате да се забавляваме заедно!"). Keep total length between 100 and 250 words.

Return a JSON object with these optional fields (omit fields you cannot determine):
{
  "title": "string — event name",
  "description": "string — promotional Bulgarian description as described above",
  "startDate": "YYYY-MM-DD — use nearest future date if year not specified",
  "endDate": "YYYY-MM-DD — same as startDate for single-day events",
  "startTime": "HH:MM — 24-hour format",
  "endTime": "HH:MM — 24-hour format, optional",
  "address": "string — street address",
  "town": "string — city name in Bulgarian, default Русе if the event is in Ruse",
  "place": "string — venue or location name",
  "price": "string — e.g. '10 лв', '5-15 лв', 'безплатно'; empty string if unknown",
  "ticketsLink": "string — URL for ticket purchase, optional",
  "fbLink": "string — Facebook event URL, optional"
}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(key);
}

function parseDraftFromJson(raw: string): EventDraft {
  // Strip any accidental markdown fences if Gemini ignores instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const draft: EventDraft = {};

  if (typeof parsed.title === "string" && parsed.title)
    draft.title = parsed.title;
  if (typeof parsed.description === "string" && parsed.description)
    draft.description = plainTextToHtml(parsed.description);
  if (typeof parsed.startDate === "string" && parsed.startDate)
    draft.startDate = parsed.startDate;
  if (typeof parsed.endDate === "string" && parsed.endDate)
    draft.endDate = parsed.endDate;
  if (typeof parsed.startTime === "string" && parsed.startTime)
    draft.startTime = parsed.startTime;
  if (typeof parsed.endTime === "string" && parsed.endTime)
    draft.endTime = parsed.endTime;
  if (typeof parsed.address === "string" && parsed.address)
    draft.address = parsed.address;
  if (typeof parsed.town === "string" && parsed.town)
    draft.town = parsed.town;
  if (typeof parsed.place === "string" && parsed.place)
    draft.place = parsed.place;
  if (typeof parsed.price === "string") draft.price = parsed.price;
  if (typeof parsed.ticketsLink === "string" && parsed.ticketsLink)
    draft.ticketsLink = parsed.ticketsLink;
  if (typeof parsed.fbLink === "string" && parsed.fbLink)
    draft.fbLink = parsed.fbLink;

  return draft;
}

/**
 * Converts plain text with paragraph breaks into simple <p> HTML.
 * Gemini returns plain text; TipTap expects HTML.
 */
function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>").trim()}</p>`)
    .filter((p) => p !== "<p></p>")
    .join("");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function extractDraftFromText(text: string): Promise<EventDraft> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(text);
  const raw = result.response.text();
  return parseDraftFromJson(raw);
}

export async function extractDraftFromImageBytes(
  imageBytes: Uint8Array,
  mimeType: string,
): Promise<EventDraft> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: Buffer.from(imageBytes).toString("base64"),
      },
    },
    "Extract event details from this image.",
  ]);

  const raw = result.response.text();
  return parseDraftFromJson(raw);
}
