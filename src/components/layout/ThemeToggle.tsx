"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "~/components/ThemeProvider";
import { Button } from "~/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  function toggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
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
