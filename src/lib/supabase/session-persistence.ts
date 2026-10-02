/** Tracks whether the user opted in to a persistent session across browser restarts. */
export const AUTH_REMEMBER_COOKIE = "a4r-remember";

const PERSISTENT_MAX_AGE = 400 * 24 * 60 * 60;
/** Used when "remember me" is off. Must not be a session cookie — iOS Safari drops those when the tab is backgrounded (camera, Photos). */
const SHORT_SESSION_MAX_AGE = 7 * 24 * 60 * 60;

type CookieOptions = {
  path?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  domain?: string;
  priority?: "low" | "medium" | "high";
  encode?: (value: string) => string;
  partitioned?: boolean;
};

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};

  if (!cookieHeader) return result;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    result[rawName] = decodeURIComponent(rawValue.join("="));
  }

  return result;
}

function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options.path) segments.push(`Path=${options.path}`);
  if (options.sameSite) {
    const sameSite =
      typeof options.sameSite === "string"
        ? `${options.sameSite[0]?.toUpperCase() ?? ""}${options.sameSite.slice(1)}`
        : "Lax";
    segments.push(`SameSite=${sameSite}`);
  }
  if (options.maxAge === 0) {
    segments.push("Max-Age=0");
  } else if (typeof options.maxAge === "number") {
    segments.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires) {
    segments.push(`Expires=${options.expires.toUTCString()}`);
  }

  return segments.join("; ");
}

const BASE_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
};

export function getRememberFlagCookieOptions(remember: boolean): CookieOptions {
  return {
    ...BASE_COOKIE_OPTIONS,
    maxAge: remember ? PERSISTENT_MAX_AGE : SHORT_SESSION_MAX_AGE,
  };
}

/**
 * Matches the session token cookies only. The PKCE code verifier is named
 * `<storageKey>-code-verifier`, so it also contains `-auth-token`, but it must
 * never become a session cookie: it is written when a sign-up, password reset,
 * or OAuth flow starts and read back when the user returns from the email link,
 * which can be hours later and after the browser has been closed.
 */
export function isSupabaseAuthCookie(name: string): boolean {
  return name.includes("-auth-token") && !name.includes("-code-verifier");
}

export function rememberFromCookieValue(value: string | undefined): boolean {
  return value === "1";
}

/** Missing cookie means persist — matches the login form default and OAuth callback. */
export function rememberPreferenceFromCookie(
  value: string | undefined,
): boolean {
  if (value === undefined) return true;
  return rememberFromCookieValue(value);
}

export function applyRememberPolicyToCookieOptions<
  T extends { maxAge?: number; expires?: Date },
>(cookieName: string, options: T, remember: boolean): T {
  if (!isSupabaseAuthCookie(cookieName)) {
    return options;
  }
  if (remember) {
    return options;
  }

  return {
    ...options,
    maxAge: SHORT_SESSION_MAX_AGE,
    expires: undefined,
  };
}

export function setAuthRememberPreference(remember: boolean) {
  if (typeof document === "undefined") return;

  document.cookie = serializeCookie(
    AUTH_REMEMBER_COOKIE,
    remember ? "1" : "0",
    getRememberFlagCookieOptions(remember),
  );
}

export function getAuthRememberPreference(): boolean {
  if (typeof document === "undefined") return true;

  const parsed = parseCookies(document.cookie);
  return rememberPreferenceFromCookie(parsed[AUTH_REMEMBER_COOKIE]);
}

export function clearAuthRememberPreference() {
  if (typeof document === "undefined") return;

  document.cookie = serializeCookie(AUTH_REMEMBER_COOKIE, "", {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 0,
  });
}
