import { parse, serialize } from "cookie";

import {
  applyRememberPolicyToCookieOptions,
  getAuthRememberPreference,
} from "./session-persistence";

/** Browser cookie adapter for createBrowserClient — applies remember-me policy on every write. */
export const browserCookieMethods = {
  getAll() {
    const parsed = parse(document.cookie);
    return Object.keys(parsed).map((name) => ({
      name,
      value: parsed[name] ?? "",
    }));
  },
  setAll(
    cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[],
  ) {
    const remember = getAuthRememberPreference();

    for (const { name, value, options } of cookiesToSet) {
      document.cookie = serialize(
        name,
        value,
        applyRememberPolicyToCookieOptions(
          name,
          options as { maxAge?: number; expires?: Date },
          remember,
        ),
      );
    }
  },
};
