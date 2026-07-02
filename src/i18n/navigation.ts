import { createNavigation } from "next-intl/navigation";

import { routing } from "~/i18n/routing";

// Locale-aware navigation helpers — use these instead of next/navigation
// so route changes automatically carry the active locale.
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
