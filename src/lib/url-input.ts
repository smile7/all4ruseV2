/** Accepts https URLs and bare domains like `all4ruse.com/path`. */
export function isValidWebUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const host = url.hostname;
    if (!host) return false;
    return host === "localhost" || host.includes(".");
  } catch {
    return false;
  }
}

/** Normalizes user input to an absolute https URL for storage and href use. */
export function normalizeWebUrl(
  input: string | null | undefined,
): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  if (!isValidWebUrl(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isOptionalWebUrl(input: string | undefined): boolean {
  return !input?.trim() || isValidWebUrl(input);
}
