"use client";

import { useTranslations } from "next-intl";

import { Search } from "lucide-react";

import { FilterContent } from "~/components/EventFilters";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useFilterPanel } from "~/contexts/FilterPanelContext";
import { useMediaQuery } from "~/hooks";
import { useFilters } from "~/hooks/useFilters";
import { usePathname } from "~/i18n/navigation";

/**
 * Desktop-only filter popover.
 * Uses shadcn Popover with zoom-in/zoom-out animation classes.
 */
export function HeaderDesktopFiltersPanel() {
  const t = useTranslations("HomePage");
  const { isOpen, open, close } = useFilterPanel();
  const { activeCount } = useFilters();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const pathname = usePathname();

  if (!isDesktop || pathname !== "/") return null;

  return (
    <div className="hidden md:block">
      <Popover open={isOpen && isDesktop} onOpenChange={(nextOpen) => (nextOpen ? open() : close())}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            aria-label={t("filters")}
            aria-expanded={isOpen}
            variant="outline"
            className="bg-accent cursor-pointer hover:bg-background relative flex w-full max-w-sm items-center justify-center gap-2 rounded-full py-4 px-10 text-xs tracking-wider uppercase"
          >
            <Search className="text-primary size-4 shrink-0" />
            <span className="mt-0.5">{t("searchButtonText")}</span>
            {activeCount > 0 && (
              <span className="bg-primary text-primary-foreground absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-bold leading-none">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="center"
          side="bottom"
          className="data-[state=open]:zoom-in-0! data-[state=closed]:zoom-out-0! bg-background w-[min(92vw,1000px)] origin-center border-border/70 p-5 duration-400"
        >
          <FilterContent />
        </PopoverContent>
      </Popover>
    </div>
  );
}
