"use client";

import { useTranslations } from "next-intl";

import { FilterContent } from "~/components/EventFilters";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { useFilterPanel } from "~/contexts/FilterPanelContext";
import { useMediaQuery } from "~/hooks";

/**
 * Mobile bottom drawer that shows the filter UI.
 * Controlled by FilterPanelContext — the trigger lives in HeaderSearchButton.
 * Rendered at layout level so it sits outside the sticky header DOM node and
 * portal-renders to the document body via vaul.
 */
export function FiltersMobileDrawer() {
  const t = useTranslations("HomePage");
  const { isOpen, close } = useFilterPanel();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  return (
    <Drawer open={isOpen && isMobile} onOpenChange={(v) => !v && close()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("filters")}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {t("filters")}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-auto px-4 pb-6">
          <FilterContent />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
