import {
  type GenerateContentResult,
  GoogleGenerativeAI,
} from "@google/generative-ai";

import type { EventDraft } from "~/types";

/** Cheapest multimodal model — sufficient for structured extraction. */
const MODEL_NAME = "gemini-2.5-flash-lite";
/** Only used for transient rate limits, not billing depletion. */
const FALLBACK_MODEL_NAME = "gemini-2.0-flash-lite";
const MAX_EXTRACTION_ATTEMPTS = 1;

const JSON_FIELDS = `{
  "title": "string — event name",
  "description": "string",
  "startDate": "YYYY-MM-DD — nearest future date if year omitted",
  "endDate": "YYYY-MM-DD — same as startDate for single-day events",
  "startTime": "HH:MM — 24-hour format",
  "endTime": "HH:MM — 24-hour format, optional",
  "address": "string — street address",
  "town": "string — city in Bulgarian, default Русе when in Ruse",
  "place": "string — venue name",
  "price": "string — e.g. '10 лв', 'безплатно'; empty if unknown",
  "ticketsLink": "string — optional",
  "fbLink": "string — optional"
}`;

const IMAGE_SYSTEM_PROMPT = `You extract event details from poster/flyer images for a Bulgarian events website in Ruse.

Return ONLY valid JSON — no markdown, no explanation.

Rules:
- Read text visible on the poster (OCR). Do not invent dates, venues, or prices that are not visible or clearly implied.
- For "description": transcribe or briefly summarize the poster text in Bulgarian (max 60 words), in a warm, friendly tone — like a local event organizer, not a dry listing. Use 1–2 fitting emoji naturally, never decorative. Plain text only.
- Omit fields you cannot determine.

Return a JSON object with these optional fields:
${JSON_FIELDS}`;

const TEXT_SYSTEM_PROMPT = `You extract event details from user-provided text for a Bulgarian events website in Ruse.

Return ONLY valid JSON — no markdown, no explanation.

Rules:
- Extract structured fields from the input. Do not invent facts not present in the text.
- For "description": reformat the user's text into 1–2 short paragraphs in Bulgarian (max 100 words). Keep their facts; light polish only — not a marketing rewrite. Write with warmth, like a local event organizer talking to a friend, and use 1–2 fitting emoji naturally — never decorative or forced.
- Omit fields you cannot determine.

Return a JSON object with these optional fields:
${JSON_FIELDS}`;

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

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isBillingDepleted(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("credits are depleted") ||
    msg.includes("prepayment") ||
    msg.includes("billing")
  );
}

function isRateLimitError(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return msg.includes("429") || msg.includes("resource exhausted");
}

/** Transient server-side overload — distinct from the caller's own rate limit or billing state. */
function isServiceUnavailableError(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("service unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("high demand")
  );
}

function isRetryableWithFallback(err: unknown): boolean {
  return isRateLimitError(err) || isServiceUnavailableError(err);
}

function createExtractionModel(
  modelName: string,
  systemInstruction: string,
  maxOutputTokens: number,
) {
  return getClient().getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens,
      responseMimeType: "application/json",
    },
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
      console.warn(
        `[smart-fill/gemini] ${label} attempt ${attempt}/${MAX_EXTRACTION_ATTEMPTS} failed: ${errorMessage(err)}`,
      );
      if (isBillingDepleted(err) || isRetryableWithFallback(err)) break;
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
    throw err instanceof Error
      ? err
      : new Error("Failed to read model response");
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
  if (typeof parsed.town === "string" && parsed.town) draft.town = parsed.town;
  if (typeof parsed.place === "string" && parsed.place)
    draft.place = parsed.place;
  if (typeof parsed.price === "string") draft.price = parsed.price;
  if (typeof parsed.ticketsLink === "string" && parsed.ticketsLink)
    draft.ticketsLink = parsed.ticketsLink;
  if (typeof parsed.fbLink === "string" && parsed.fbLink)
    draft.fbLink = parsed.fbLink;

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

function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>").trim()}</p>`)
    .filter((p) => p !== "<p></p>")
    .join("");
}

type ExtractionContent =
  | string
  | Parameters<ReturnType<typeof createExtractionModel>["generateContent"]>[0];

async function generateDraftFromContent(
  content: ExtractionContent,
  systemInstruction: string,
  maxOutputTokens: number,
): Promise<EventDraft> {
  const run = (modelName: string) =>
    withExtractionRetries(`extract:${modelName}`, async () => {
      const model = createExtractionModel(
        modelName,
        systemInstruction,
        maxOutputTokens,
      );
      const result = await model.generateContent(content);
      return parseDraftFromJson(readModelText(result));
    });

  try {
    return await run(MODEL_NAME);
  } catch (primaryErr) {
    if (isBillingDepleted(primaryErr)) {
      throw new QuotaExceededError(
        "Gemini API credits depleted. Add billing at https://aistudio.google.com/",
      );
    }

    if (!isRetryableWithFallback(primaryErr)) throw primaryErr;

    console.warn(
      `[smart-fill/gemini] Primary model rate-limited or unavailable, trying ${FALLBACK_MODEL_NAME}`,
    );
    try {
      return await run(FALLBACK_MODEL_NAME);
    } catch (fallbackErr) {
      if (
        isBillingDepleted(fallbackErr) ||
        isRetryableWithFallback(fallbackErr)
      ) {
        throw new QuotaExceededError(
          "API quota exceeded. Please try again later.",
        );
      }
      throw fallbackErr;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function extractDraftFromText(text: string): Promise<EventDraft> {
  return generateDraftFromContent(text, TEXT_SYSTEM_PROMPT, 768);
}

export async function extractDraftFromImageBytes(
  imageBytes: Uint8Array,
  mimeType: string,
  additionalText?: string,
): Promise<EventDraft> {
  const trimmedText = additionalText?.trim();
  const instruction = trimmedText
    ? `Extract visible event details from this poster. The user also provided this additional context — use it to fill in or correct details that aren't clear from the image alone:\n"""${trimmedText}"""\nReturn JSON only.`
    : "Extract visible event details from this poster. Return JSON only.";

  return generateDraftFromContent(
    [
      {
        inlineData: {
          mimeType,
          data: Buffer.from(imageBytes).toString("base64"),
        },
      },
      instruction,
    ],
    IMAGE_SYSTEM_PROMPT,
    512,
  );
}
