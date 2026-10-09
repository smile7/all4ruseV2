import { isEventTagPromoLive } from "~/lib/api/articles";
import {
  type FeaturedHeaderPromo,
  getFeaturedHeaderPromo,
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
  const featuredPromo = await liveFeaturedHeaderPromo();

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

        {/* Row 2: full-width link to the featured article */}
        {featuredPromo ? (
          <HeaderMoreFromRuseLink
            variant="mobile"
            expiresOn={featuredPromo.event_tag_expires_on}
          />
        ) : null}
      </div>

      {/* ── Desktop (md+) — 3-column grid: left | center | right ──────── */}
      <HeaderInnerContainer>
        {/* Left — logo */}
        <div className="flex items-center justify-start">
          <Logo />
        </div>

        {/* Center — featured article, exactly centered */}
        <div className="flex items-center justify-center">
          {featuredPromo ? (
            <HeaderMoreFromRuseLink
              expiresOn={featuredPromo.event_tag_expires_on}
            />
          ) : null}
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
 * Null when the featured article is unpublished, paused, or past its last day.
 * The expiry is re-checked in the browser so a long-lived cached page still
 * drops the button on the right Sofia day.
 */
async function liveFeaturedHeaderPromo(): Promise<FeaturedHeaderPromo | null> {
  try {
    const promo = await getFeaturedHeaderPromo();
    if (!promo) return null;
    return isEventTagPromoLive(promo, todayInSofia()) ? promo : null;
  } catch (error) {
    console.error("Failed to load featured header article", error);
    return null;
  }
}
