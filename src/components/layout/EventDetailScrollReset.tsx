"use client";

import { useLayoutEffect } from "react";

export function EventDetailScrollReset() {
  useLayoutEffect(() => {
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });

    return () => {
      window.history.scrollRestoration = prev;
    };
  }, []);

  return null;
}
