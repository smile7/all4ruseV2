import {
  type GenerateContentResult,
  GoogleGenerativeAI,
} from "@google/generative-ai";

import type { EventDraft } from "~/types";

const MODEL_NAME = "gemini-2.0-flash";
const FALLBACK_MODEL_NAME = "gemini-2.0-flash-lite";
const MAX_EXTRACTION_ATTEMPTS = 3;

const GENERATION_CONFIG = {
  temperature: 0.2,
  maxOutputTokens: 2048,
  responseMimeType: "application/json",
} as const;

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an event detail extractor for an event listing website in Ruse, Bulgaria.

Extract event details from the provided input and return ONLY a valid JSON object — no markdown fences, no explanation, nothing else.

For the "description" field: write in Bulgarian in the voice of a local event organizer or cultural journalist — someone who knows the city, cares about the event, and writes with calm enthusiasm. The tone is warm and engaged, but composed. Not a marketing flyer, not casual chat between friends.

Structure: 2–3 paragraphs separated by a blank line (\\n\\n). Never write one long unbroken block.
- Paragraph 1: Open with something concrete and specific about this event — what makes it worth attending. Avoid generic openers like "Елате на" or "Имаме удоволствието да".
- Paragraph 2: Include the practical details (date, time, venue, price if known) naturally woven into sentences — not listed, not announced.
- Paragraph 3 (short, optional): A grounded closing line or two. Not a tagline.

Writing rules:
- Vary sentence length. Not every sentence the same rhythm.
- Use 1–2 emoji only where genuinely fitting — never decorative.
- Avoid clichés that signal AI: "уникална възможност", "незабравимо изживяване", "не пропускайте шанса", "свидетели на", "невероятна атмосфера", "ви очаква", "потопете се", "специално за вас", "зарежда с енергия", "богата програма".
- Do not use bullet points or headers inside the description.
- Total length: 90–200 words.

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

/** Thrown when the API quota for the current model is exhausted. */
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

function isQuotaError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes("429") || msg.includes("quota");
}

function createExtractionModel(modelName = MODEL_NAME) {
  return getClient().getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: GENERATION_CONFIG,
  });
}

async function withExtractionRetries<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_EXTRACTION_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[smart-fill/gemini] ${label} attempt ${attempt}/${MAX_EXTRACTION_ATTEMPTS} failed: ${message}`,
      );
      // Quota errors won't resolve with retries — bail immediately.
      if (isQuotaError(err)) break;
      if (attempt < MAX_EXTRACTION_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  throw lastError;
}

function readModelText(result: GenerateContentResult): string {
  try {
    const text = result.response.text().trim();
    if (!text) throw new Error("Empty response from model");
    return text;
  } catch (err) {
    const blockReason = result.response.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Model blocked response: ${blockReason}`);
    }
    throw err instanceof Error ? err : new Error("Failed to read model response");
  }
}

function extractJsonObject(raw: string): string {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    throw new Error("No JSON object found in model response");
  }
}

function parseDraftFromJson(raw: string): EventDraft {
  const parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;

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

  // Guard: if nothing useful was extracted, throw so callers return a proper
  // error rather than silently applying an empty draft and showing success.
  const hasMeaningfulContent =
    !!draft.title ||
    !!draft.description ||
    !!draft.startDate ||
    !!draft.place ||
    !!draft.address;

  if (!hasMeaningfulContent) {
    throw new Error("No event details could be extracted from the input");
  }

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

async function generateDraftFromContent(
  content: string | Parameters<ReturnType<typeof createExtractionModel>["generateContent"]>[0],
): Promise<EventDraft> {
  try {
    const model = createExtractionModel(MODEL_NAME);
    return await withExtractionRetries("extract", async () => {
      const result = await model.generateContent(content);
      return parseDraftFromJson(readModelText(result));
    });
  } catch (primaryErr) {
    if (!isQuotaError(primaryErr)) throw primaryErr;

    // Primary model quota exhausted — retry with fallback model.
    console.warn(
      `[smart-fill/gemini] Primary model quota exceeded, falling back to ${FALLBACK_MODEL_NAME}`,
    );
    try {
      const fallback = createExtractionModel(FALLBACK_MODEL_NAME);
      return await withExtractionRetries("extract-fallback", async () => {
        const result = await fallback.generateContent(content);
        return parseDraftFromJson(readModelText(result));
      });
    } catch (fallbackErr) {
      if (isQuotaError(fallbackErr)) {
        throw new QuotaExceededError(
          "API quota exceeded on all available models. Please try again later.",
        );
      }
      throw fallbackErr;
    }
  }
}

export async function extractDraftFromText(text: string): Promise<EventDraft> {
  return generateDraftFromContent(text);
}

export async function extractDraftFromImageBytes(
  imageBytes: Uint8Array,
  mimeType: string,
): Promise<EventDraft> {
  return generateDraftFromContent([
    {
      inlineData: {
        mimeType,
        data: Buffer.from(imageBytes).toString("base64"),
      },
    },
    "Extract all visible event details from this image. Return structured JSON with title, dates, times, venue, address, and price when present.",
  ]);
}
