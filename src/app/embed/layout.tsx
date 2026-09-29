import type { ReactNode } from "react";
import type { Viewport } from "next";

import { DEFAULT_LOCALE } from "~/constants";

import { comfortaa } from "../fonts";

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#e06830",
};

type Props = {
  children: ReactNode;
};

// The widget sits outside the `[locale]` segment, so it renders its own
// document. Always Bulgarian: partner sites embedding it are local.
export default function EmbedLayout({ children }: Props) {
  return (
    <html lang={DEFAULT_LOCALE} className={comfortaa.variable}>
      <body className="min-h-screen antialiased">
        <div className="bg-background text-foreground h-dvh overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
