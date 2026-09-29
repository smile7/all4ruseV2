import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#e06830",
};

type Props = {
  children: ReactNode;
};

export default function EmbedLayout({ children }: Props) {
  return (
    <div className="bg-background text-foreground h-dvh overflow-hidden">
      {children}
    </div>
  );
}
