"use client";

import { useEffect } from "react";

import { isInSiteNavigation } from "~/lib/analytics/in-site-navigation";
import { trackClick } from "~/lib/analytics/track-click";

/**
 * Counts a reader who leaves the family-weekend article for another page
 * on this site: an event card, Home, "see all events", or any other in-site link.
 * Each click adds one. Off-site links and same-page jumps are ignored.
 */
export function ArticleStayTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const isPrimary = event.type === "click" && event.button === 0;
      const isMiddle = event.type === "auxclick" && event.button === 1;
      if (!isPrimary && !isMiddle) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor || anchor.classList.contains("article-lightbox")) return;

      const href = anchor.getAttribute("href");
      if (!href || !isInSiteNavigation(href, window.location)) return;

      trackClick("article.family_weekend.stayed");
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  return null;
}
