/** Tracks whether the user opted in to a persistent session across browser restarts. */
export const AUTH_REMEMBER_COOKIE = "a4r-remember";

const PERSISTENT_MAX_AGE = 400 * 24 * 60 * 60;

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
  return remember
    ? { ...BASE_COOKIE_OPTIONS, maxAge: PERSISTENT_MAX_AGE }
    : BASE_COOKIE_OPTIONS;
}

export function isSupabaseAuthCookie(name: string): boolean {
  return name.includes("-auth-token");
}

export function rememberFromCookieValue(value: string | undefined): boolean {
  return value === "1";
}

export function applyRememberPolicyToCookieOptions<
  T extends { maxAge?: number; expires?: Date },
>(cookieName: string, options: T, remember: boolean): T {
  if (!isSupabaseAuthCookie(cookieName) || remember) {
    return options;
  }

  const { maxAge: _maxAge, expires: _expires, ...sessionOptions } = options;
  return sessionOptions as T;
}

export function setAuthRememberPreference(remember: boolean) {
  if (typeof document === "undefined") return;

  const options: CookieOptions = remember
    ? { ...BASE_COOKIE_OPTIONS, maxAge: PERSISTENT_MAX_AGE }
    : BASE_COOKIE_OPTIONS;

  document.cookie = serializeCookie(
    AUTH_REMEMBER_COOKIE,
    remember ? "1" : "0",
    options,
  );
}

export function getAuthRememberPreference(): boolean {
  if (typeof document === "undefined") return false;

  const parsed = parseCookies(document.cookie);
  return rememberFromCookieValue(parsed[AUTH_REMEMBER_COOKIE]);
}

export function clearAuthRememberPreference() {
  if (typeof document === "undefined") return;

  document.cookie = serializeCookie(AUTH_REMEMBER_COOKIE, "", {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 0,
  });
}
