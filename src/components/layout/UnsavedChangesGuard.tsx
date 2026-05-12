"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { Button } from "~/components/ui/button";
import { LOCALES } from "~/constants";
import { useRouter } from "~/i18n/navigation";

import { DrawerDialog } from "./DrawerDialog";

function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  const maybeLocale = segments[0];
  if (
    maybeLocale !== undefined &&
    (LOCALES as readonly string[]).includes(maybeLocale)
  ) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function navigationFingerprint(url: URL): string {
  return `${stripLocaleFromPath(url.pathname)}${url.search}`;
}

type PendingNavigation =
  | { type: "href"; href: string }
  | { type: "action"; run: () => void };

type UnsavedChangesContextValue = {
  setDirty: (dirty: boolean) => void;
  navigateWithGuard: (action: () => void) => void;
};

const UnsavedChangesContext = createContext<
  UnsavedChangesContextValue | undefined
>(undefined);

export function UnsavedChangesGuardProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const pendingRef = useRef<PendingNavigation | null>(null);

  const router = useRouter();
  const t = useTranslations("UnsavedChanges");

  const setDirty = useCallback((value: boolean) => {
    dirtyRef.current = value;
    setDirtyState(value);
  }, []);

  const cancelNavigate = useCallback(() => {
    pendingRef.current = null;
    setPromptOpen(false);
  }, []);

  const flushNavigate = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setPromptOpen(false);
    setDirty(false);
    if (!pending) return;
    if (pending.type === "href") {
      router.push(pending.href);
      return;
    }
    pending.run();
  }, [router, setDirty]);

  const navigateWithGuard = useCallback((action: () => void) => {
    if (!dirtyRef.current) {
      action();
      return;
    }
    pendingRef.current = { type: "action", run: action };
    setPromptOpen(true);
  }, []);

  const ctxValue = useMemo(
    () => ({
      setDirty,
      navigateWithGuard,
    }),
    [setDirty, navigateWithGuard],
  );

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;

    const handleDocumentClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;

      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return;
      }

      const hrefAttr = anchor.getAttribute("href");
      if (
        hrefAttr == null ||
        hrefAttr === "" ||
        hrefAttr.startsWith("#") ||
        hrefAttr.startsWith("mailto:") ||
        hrefAttr.startsWith("tel:")
      ) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.origin);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const currentUrl = new URL(window.location.href);
      if (navigationFingerprint(currentUrl) === navigationFingerprint(url)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      pendingRef.current = {
        type: "href",
        href: stripLocaleFromPath(url.pathname) + url.search + url.hash,
      };
      setPromptOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () =>
      document.removeEventListener("click", handleDocumentClick, true);
  }, [dirty]);

  return (
    <UnsavedChangesContext.Provider value={ctxValue}>
      {children}

      <DrawerDialog
        open={promptOpen}
        setOpen={(next) => {
          const resolved =
            typeof next === "function" ? next(promptOpen) : next;
          if (!resolved) cancelNavigate();
          else setPromptOpen(true);
        }}
        title={t("title")}
        description={t("description")}
      >
        <div className="flex flex-col-reverse gap-3 p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={cancelNavigate}>
            {t("stay")}
          </Button>
          <Button type="button" variant="default" onClick={flushNavigate}>
            {t("leave")}
          </Button>
        </div>
      </DrawerDialog>
    </UnsavedChangesContext.Provider>
  );
}

/** Registers global unsaved state while mounted (cleared on unmount). */
export function useRegisterUnsavedChanges(isDirty: boolean) {
  const ctx = useContext(UnsavedChangesContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setDirty(isDirty);
    return () => ctx.setDirty(false);
  }, [ctx, isDirty]);
}

/** Runs navigation after prompting when there are unsaved changes. */
export function useUnsavedChangesNavigate() {
  const ctx = useContext(UnsavedChangesContext);

  return useCallback(
    (action: () => void) => {
      if (!ctx) {
        action();
        return;
      }
      ctx.navigateWithGuard(action);
    },
    [ctx],
  );
}
