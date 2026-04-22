import { getRequestConfig } from "next-intl/server";

import { routing } from "~/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Fall back to defaultLocale if the requested locale is not supported
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`~/i18n/messages/${locale}.json`)).default as Record<string, unknown>,
  };
});
