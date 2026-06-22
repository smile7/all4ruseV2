export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9-]{3,30}$/;
export const USERNAME_VALIDATION_MESSAGE =
  "3–30 знака: малки букви, цифри, тире";

/** Strip input to allowed username characters (lowercase alphanumeric + dash). */
export function sanitizeUsernameInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/**
 * Derive a valid username base from an email address.
 * e.g. "silvena.miteva@gmail.com" → "silvena-miteva"
 */
export function deriveUsernameFromEmail(email: string): string {
  const prefix = email.split("@")[0] ?? email;
  const cleaned = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, USERNAME_MAX_LENGTH);

  if (cleaned.length >= USERNAME_MIN_LENGTH) return cleaned;
  return cleaned.padEnd(USERNAME_MIN_LENGTH, "0");
}

export function isUsernameInvalid(username: string | null | undefined): boolean {
  if (!username) return true;
  if (username.includes("@")) return true;
  return !USERNAME_PATTERN.test(username);
}

/** Build a username candidate with optional numeric suffix, respecting max length. */
export function buildUsernameCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base;

  const suffix = `-${attempt}`;
  const maxBaseLen = USERNAME_MAX_LENGTH - suffix.length;
  const trimmedBase =
    base.slice(0, maxBaseLen).replace(/-+$/g, "") || base.slice(0, maxBaseLen);

  return `${trimmedBase}${suffix}`;
}

/** Last-resort unique slug from a user id when email-based candidates are exhausted. */
export function deriveUsernameFromUserId(userId: string): string {
  const slug = userId.replace(/-/g, "").slice(0, USERNAME_MAX_LENGTH - 2);
  return `u-${slug}`;
}
