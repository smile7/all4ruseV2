"use client";

import { usePathname } from "next/navigation";

import { LOCALES } from "~/constants";
import { cn } from "~/lib/utils";

const HOME_PATHS = new Set(LOCALES.map((l) => `/${l}`));

type Props = {
  children: React.ReactNode;
};

export function HeaderInnerContainer({ children }: Props) {
  const pathname = usePathname();
  const isHome = HOME_PATHS.has(pathname);

  return (
    <div
      className={cn(
        "mx-auto hidden h-16 grid-cols-3 items-center px-6 md:grid lg:px-8",
        isHome
          ? // At xl+, <main> gains xl:px-30 (7.5rem) and the content div has lg:px-8 (2rem).
            // Combined inset = 9.5rem each side — mirror that here so the logo/controls
            // visually align with the events grid left/right edges.
            "xl:px-38"
          : "max-w-7xl",
      )}
    >
      {children}
    </div>
  );
}
