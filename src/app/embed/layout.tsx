import type { ReactNode } from "react";
import type { Viewport } from "next";
import localFont from "next/font/local";

import "../globals.css";

const comfortaa = localFont({
  variable: "--font-comfortaa",
  display: "swap",
  src: [
    {
      path: "../../../public/fonts/Comfortaa-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Comfortaa-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Comfortaa-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Comfortaa-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Comfortaa-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#e06830",
};

type Props = {
  children: ReactNode;
};

export default function EmbedLayout({ children }: Props) {
  return (
    <html lang="bg" className={`${comfortaa.variable} h-full`}>
      <body className="bg-background text-foreground h-full overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
