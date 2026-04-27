import { useTranslations } from "next-intl";

import { Search } from "lucide-react";

import { Button } from "~/components/ui/button";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const t = useTranslations("HomePage");

  return (
    <header className="border-border/60 bg-background/85 sticky top-0 z-40 w-full backdrop-blur-md">
      {/* ── Mobile (<md) ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 px-3 py-2 md:hidden">
        {/* Row 1: lang+theme (left) | Logo (center) | login (right) */}
        <div className="grid grid-cols-3 items-center border-b pb-4">
          <div className="flex items-center justify-start gap-0.5">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-center">
            <Logo />
          </div>
          <div className="flex items-center justify-end">
            <Button size="sm">{t("loginButton")}</Button>
          </div>
        </div>

        {/* Row 2: full-width filter bar */}
        <button
          type="button"
          aria-label={t("filters")}
          className="bg-muted text-muted-foreground hover:bg-muted/80 flex w-full items-center justify-center gap-2 rounded-full p-3 text-xs font-medium tracking-wider uppercase transition-colors"
        >
          <Search className="text-primary size-4 shrink-0" />
          <span>{t("searchButtonText")}</span>
        </button>
      </div>

      {/* ── Desktop (md+) — 3-column grid: left | center | right ──────── */}
      <div className="mx-auto hidden h-16 max-w-7xl grid-cols-3 items-center px-6 md:grid lg:px-8">
        {/* Left — logo */}
        <div className="flex items-center justify-start">
          <Logo />
        </div>

        {/* Center — filter entry point, exactly centered */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            aria-label={t("filters")}
            className="bg-muted text-muted-foreground hover:bg-muted/80 flex w-full max-w-sm items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wider uppercase transition-colors"
          >
            <Search className="text-primary size-4 shrink-0" />
            <span>{t("searchButtonText")}</span>
          </button>
        </div>

        {/* Right — controls */}
        <div className="flex items-center justify-end gap-1.5">
          <LocaleSwitcher />
          <ThemeToggle />
          <div className="bg-border mx-1 h-5 w-px" aria-hidden />
          {/* Auth wiring comes in task 3.6 */}
          <Button size="sm">{t("loginButton")}</Button>
        </div>
      </div>
    </header>
  );
}
