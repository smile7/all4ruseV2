"use client";

import { useLayoutEffect } from "react";

export function EventDetailScrollReset() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return null;
}
