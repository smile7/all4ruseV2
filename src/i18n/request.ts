import { getRequestConfig } from "next-intl/server";

import type { Locale } from "~/constants";
import bg from "~/i18n/messages/bg.json";
import en from "~/i18n/messages/en.json";
import ro from "~/i18n/messages/ro.json";
import ua from "~/i18n/messages/ua.json";
import { routing } from "~/i18n/routing";

const messagesByLocale = { bg, en, ro, ua } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Fall back to defaultLocale if the requested locale is not supported
  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messagesByLocale[locale as Locale],
  };
});
