"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { usePathname } from "~/i18n/navigation";

type DocumentWithViewTransition = Document & {
  activeViewTransition?: { finished: Promise<unknown> } | null;
};

function scrollToTop(behavior: ScrollBehavior) {
  window.scrollTo({ top: 0, left: 0, behavior });
}

export function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const prevPathname = useRef<string | null>(null);
  const isPop = useRef(false);
  const shouldReset = useRef(false);
  const positions = useRef(new Map<string, number>());

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const onPopState = () => {
      isPop.current = true;
    };
    const onScroll = () => {
      positions.current.set(pathnameRef.current, window.scrollY);
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    pathnameRef.current = pathname;

    if (prevPathname.current === pathname) return;

    const previous = prevPathname.current;
    prevPathname.current = pathname;

    if (previous === null) return;

    if (isPop.current) {
      isPop.current = false;
      shouldReset.current = false;
      window.scrollTo({
        top: positions.current.get(pathname) ?? 0,
        behavior: "instant",
      });
      return;
    }

    shouldReset.current = true;
    scrollToTop("instant");
  }, [pathname]);

  useEffect(() => {
    if (!shouldReset.current) return;
    shouldReset.current = false;

    let cancelled = false;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const behavior: ScrollBehavior = reduceMotion ? "instant" : "smooth";

    const ensureTop = (nextBehavior: ScrollBehavior) => {
      if (cancelled || window.scrollY === 0) return;
      scrollToTop(nextBehavior);
    };

    const run = async () => {
      const vt = (document as DocumentWithViewTransition).activeViewTransition;
      if (vt?.finished) {
        try {
          await vt.finished;
        } catch {
          // Transition skipped or failed; still reset scroll.
        }
      }
      if (cancelled) return;

      ensureTop(behavior);
      requestAnimationFrame(() => ensureTop(behavior));
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
