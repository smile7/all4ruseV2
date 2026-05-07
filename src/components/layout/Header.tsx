import { getTranslations } from "next-intl/server";

import { Button } from "~/components/ui/button";

import { HeaderDesktopFiltersPanel } from "./HeaderDesktopFiltersPanel";
import { HeaderSearchButton } from "./HeaderSearchButton";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export async function Header() {
  const t = await getTranslations("HomePage");

  return (
    <header className="border-border/60 bg-secondary/85 sticky top-0 z-50 w-full backdrop-blur-md">
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

        {/* Row 2: full-width filter trigger */}
        <HeaderSearchButton variant="mobile" />
      </div>

      {/* ── Desktop (md+) — 3-column grid: left | center | right ──────── */}
      <div className="mx-auto hidden h-16 max-w-7xl grid-cols-3 items-center px-6 md:grid lg:px-8">
        {/* Left — logo */}
        <div className="flex items-center justify-start">
          <Logo />
        </div>

        {/* Center — filter entry point, exactly centered */}
        <div className="flex items-center justify-center">
          <HeaderDesktopFiltersPanel />
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
