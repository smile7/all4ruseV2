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
      variant="default"
      aria-label={t("filters")}
      aria-expanded={isOpen}
      onClick={toggle}
      className={cn(
        "relative h-auto rounded-full text-xs font-medium tracking-wider uppercase transition-colors",
        isOpen && "ring-2 ring-primary/40 ring-offset-1",
        isMobile
          ? "w-full justify-center py-2 px-4"
          : "w-full max-w-sm justify-center px-4 py-2",
      )}
    >
      <Search className="size-4 shrink-0" />
      <span>{t("searchButtonText")}</span>

      {activeCount > 0 && (
        <span className="bg-background text-primary ring-primary/20 absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-bold leading-none ring-1">
          {activeCount}
        </span>
      )}
    </Button>
  );
}
