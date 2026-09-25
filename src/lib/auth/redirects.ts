import { DEFAULT_LOCALE, LOCALES } from "~/constants";

/**
 * Error codes the auth callback routes append to the login URL. The login page
 * turns them into a message the user can act on — a failed email link needs a
 * resend, a cancelled provider login does not.
 */
export const LOGIN_ERROR_CODES = {
  emailLinkInvalid: "email_link_invalid",
  resetLinkInvalid: "reset_link_invalid",
  oauthCancelled: "oauth_cancelled",
  oauthFailed: "oauth_failed",
} as const;

export type LoginErrorCode =
  (typeof LOGIN_ERROR_CODES)[keyof typeof LOGIN_ERROR_CODES];

/**
 * `next` arrives from the query string, so it is only usable if it stays on
 * this site. Anything else (protocol-relative, absolute, or a `@host` userinfo
 * trick that would turn `${origin}${next}` into another domain) falls back to
 * the default locale home.
 */
export function safeAuthNextPath(
  next: string | null,
  fallback = `/${DEFAULT_LOCALE}`,
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    next.includes("://")
  ) {
    return fallback;
  }

  return next;
}

/**
 * A password reset needs a new reset email, not a new confirmation email, so
 * the two dead-link cases must be told apart. Recovery links are the ones
 * pointing at the update-password screen.
 */
export function isPasswordResetNext(next: string): boolean {
  const pathOnly = next.split("?")[0] ?? next;
  return pathOnly
    .replace(/^\/[a-z]{2}(?=\/|$)/, "")
    .startsWith("/auth/update-password");
}

/**
 * Where a failed callback sends the user. Keeps the locale the flow started in
 * so an English or Romanian user is not dropped on the Bulgarian login page.
 */
export function loginErrorPath(next: string, error: LoginErrorCode): string {
  const segment = next.split("/")[1] ?? "";
  const locale = (LOCALES as readonly string[]).includes(segment)
    ? segment
    : DEFAULT_LOCALE;

  return `/${locale}/auth/login?error=${error}`;
}
