import { isEventTagPromoLive } from "~/lib/api/articles";
import { pickVisibleHeaderPromos } from "~/lib/articles/featured-header";
import {
  type FeaturedHeaderPromo,
  getFeaturedHeaderPromos,
} from "~/lib/articles/featured-header-promo";
import { todayInSofia } from "~/lib/event-utils";

import { HeaderAuthButton } from "./HeaderAuthButton";
import { HeaderInnerContainer } from "./HeaderInnerContainer";
import { HeaderMoreFromRuseLink } from "./HeaderMoreFromRuseLink";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";
import { MobileBackButton } from "./MobileBackButton";
import { MobileCreateEventButton } from "./MobileCreateEventButton";
import { ThemeToggle } from "./ThemeToggle";

export async function Header() {
  const featuredPromos = await liveFeaturedHeaderPromos();

  return (
    <header className="border-border/60 bg-secondary/85 sticky top-0 z-50 w-full backdrop-blur-md">
      {/* ── Mobile (<md) ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 px-3 py-2 md:hidden">
        {/* Row 1: back + create (left) | Logo (center) | language + theme (right) */}
        <div className="grid grid-cols-3 items-center border-b pb-4">
          <div className="flex items-center justify-start gap-1.5">
            <MobileBackButton />
            <MobileCreateEventButton />
          </div>
          <div className="flex items-center justify-center">
            <Logo />
          </div>
          <div className="flex items-center justify-end gap-1">
            <LocaleSwitcher variant="outline" />
            <ThemeToggle variant="outline" />
          </div>
        </div>

        {/* Row 2: featured articles, stacked */}
        {featuredPromos.length > 0 ? (
          <div className="flex flex-col gap-2">
            {featuredPromos.map((promo) => (
              <HeaderMoreFromRuseLink
                key={promo.slug}
                variant="mobile"
                slug={promo.slug}
                titleKey={promo.titleKey}
                expiresOn={promo.event_tag_expires_on}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Desktop (md+) — 3-column grid: left | center | right ──────── */}
      <HeaderInnerContainer>
        {/* Left — logo */}
        <div className="flex items-center justify-start">
          <Logo />
        </div>

        {/* Center — featured articles, side by side */}
        <div className="flex items-center justify-center gap-2">
          {featuredPromos.map((promo) => (
            <HeaderMoreFromRuseLink
              key={promo.slug}
              slug={promo.slug}
              titleKey={promo.titleKey}
              expiresOn={promo.event_tag_expires_on}
            />
          ))}
        </div>

        {/* Right — controls */}
        <div className="flex items-center justify-end gap-1.5">
          <LocaleSwitcher />
          <ThemeToggle />
          <div className="bg-border mx-1 h-5 w-px" aria-hidden />
          <HeaderAuthButton />
        </div>
      </HeaderInnerContainer>
    </header>
  );
}

/**
 * Drops an article when it is unpublished, paused, or past its last day.
 * The expiry is re-checked in the browser so a long-lived cached page still
 * drops that button on the right Sofia day.
 */
async function liveFeaturedHeaderPromos(): Promise<FeaturedHeaderPromo[]> {
  try {
    const promos = await getFeaturedHeaderPromos();
    const today = todayInSofia();
    const live = promos.filter((promo) => isEventTagPromoLive(promo, today));
    return pickVisibleHeaderPromos(live);
  } catch (error) {
    console.error("Failed to load featured header articles", error);
    return [];
  }
}
