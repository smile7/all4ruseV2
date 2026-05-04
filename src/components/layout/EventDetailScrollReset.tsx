"use client";

import { useLayoutEffect } from "react";

export function EventDetailScrollReset() {
  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    let frameTwo = 0;

    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    window.history.scrollRestoration = "manual";
    scrollToTop();

    const frameOne = requestAnimationFrame(() => {
      scrollToTop();
      frameTwo = requestAnimationFrame(scrollToTop);
    });

    const timeoutId = window.setTimeout(scrollToTop, 120);

    return () => {
      cancelAnimationFrame(frameOne);
      if (frameTwo) cancelAnimationFrame(frameTwo);
      window.clearTimeout(timeoutId);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  return null;
}
