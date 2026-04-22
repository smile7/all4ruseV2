import { useMediaQuery } from "~/hooks/useMediaQuery";

export function useIsMobile(): boolean {
  // max-width: 767px — anything below the md breakpoint
  return useMediaQuery("(max-width: 767px)");
}
