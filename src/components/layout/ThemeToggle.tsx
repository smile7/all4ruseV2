"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "~/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  function toggle() {
    // Fall back to reading the DOM class in case resolvedTheme hasn't resolved yet
    const isDark =
      resolvedTheme === "dark" ||
      (resolvedTheme === undefined &&
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark"));
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      <Sun className="theme-icon-sun size-4" />
      <Moon className="theme-icon-moon size-4" />
    </Button>
  );
}
