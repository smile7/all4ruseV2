"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { usePathname } from "~/i18n/navigation";

type FilterPanelContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const FilterPanelContext = createContext<FilterPanelContextType | undefined>(
  undefined,
);

export function FilterPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    startTransition(() => setIsOpen(false));
  }, [pathname]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <FilterPanelContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </FilterPanelContext.Provider>
  );
}

export function useFilterPanel() {
  const ctx = useContext(FilterPanelContext);
  if (!ctx) {
    throw new Error(
      "useFilterPanel must be used inside a FilterPanelProvider",
    );
  }
  return ctx;
}
