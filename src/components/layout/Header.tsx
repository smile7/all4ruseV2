import Link from "next/link";
import { useTranslations } from "next-intl";

import { LocaleSwitcher, Logo, ThemeToggle } from ".";


export function Header() {
  const t = useTranslations("HomePage");

  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="flex items-center gap-1">
          <Link
            href="/events"
            className="text-foreground/70 hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            {t("menuEvents")}
          </Link>
          <Link
            href="/create-event"
            className="text-foreground/70 hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            {t("createEvent")}
          </Link>

          <div className="ml-2 flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
