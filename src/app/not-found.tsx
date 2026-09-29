import type { Metadata } from "next";

import { DEFAULT_LOCALE } from "~/constants";

import { comfortaa } from "./fonts";

export const metadata: Metadata = {
  title: "Страницата не е намерена",
  robots: { index: false, follow: false },
};

/**
 * Only reached for paths the locale middleware never rewrites (so no next-intl
 * context). Localised 404s live in `[locale]/not-found.tsx`. Renders its own
 * document because the root layout is a pass-through.
 */
export default function RootNotFound() {
  return (
    <html lang={DEFAULT_LOCALE} className={comfortaa.variable}>
      <body className="min-h-screen antialiased">
        <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Страницата не е намерена
          </h1>
          <a
            href={`/${DEFAULT_LOCALE}`}
            className="text-primary underline underline-offset-4"
          >
            Към събитията в Русе
          </a>
        </main>
      </body>
    </html>
  );
}
