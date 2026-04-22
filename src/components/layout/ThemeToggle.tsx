"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

import { Moon, Sun } from "lucide-react";

import { Button } from "~/components/ui/button";

function ThemeToggleInner() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

// ssr: false — the server has no knowledge of the user's theme preference,
// so any server-rendered output would mismatch the client and cause a hydration error.
// Skipping SSR for this single button is the correct trade-off.
const ThemeToggle = dynamic(() => Promise.resolve(ThemeToggleInner), {
  ssr: false,
  loading: () => <Button variant="ghost" size="icon" className="size-9" disabled aria-hidden />,
});

export { ThemeToggle };
