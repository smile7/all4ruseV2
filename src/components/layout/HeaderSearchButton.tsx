"use client";

import { useTranslations } from "next-intl";

import { Search } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useFilterPanel } from "~/contexts/FilterPanelContext";
import { useFilters } from "~/hooks/useFilters";
import { usePathname } from "~/i18n/navigation";
import { cn } from "~/lib/utils";

type Props = {
  variant?: "mobile" | "desktop";
};

export function HeaderSearchButton({ variant = "desktop" }: Props) {
  const t = useTranslations("HomePage");
  const { toggle, isOpen } = useFilterPanel();
  const { activeCount } = useFilters();
  const pathname = usePathname();

  const isMobile = variant === "mobile";

  if (pathname !== "/") return null;

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={t("filters")}
      aria-expanded={isOpen}
      onClick={toggle}
      className={cn(
        "relative h-auto rounded-full bg-accent text-muted-foreground text-xs font-medium tracking-wider uppercase transition-colors hover:bg-accent/80",
        isOpen && "ring-2 ring-primary/40",
        isMobile
          ? "w-full justify-center p-3"
          : "w-full max-w-sm justify-center px-4 py-2",
      )}
    >
      <Search className="size-4 shrink-0 text-primary" />
      <span>{t("searchButtonText")}</span>

      {activeCount > 0 && (
        <span className="bg-primary text-primary-foreground absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-bold leading-none">
          {activeCount}
        </span>
      )}
    </Button>
  );
}
