import Image from "next/image";

import { Link } from "~/i18n/navigation";

// The source files are 5488×1200 (≈4.573:1). Rendered at h-10 (40px) that is
// ~183px wide — width/height and sizes must match, otherwise next/image only
// generates variants for the declared width and upscales them on hi-DPI screens.
const LOGO_HEIGHT = 40;
const LOGO_WIDTH = 183;

export function Logo() {
  return (
    <Link href="/">
      <Image
        src="/all4ruse-logo-dark.svg"
        alt="All4Ruse"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        sizes="183px"
        quality={90}
        className="theme-logo-light h-10 w-auto object-contain"
        priority
      />
      <Image
        src="/all4ruse-logo-light.svg"
        alt="All4Ruse"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        sizes="183px"
        quality={90}
        className="theme-logo-dark h-10 w-auto object-contain"
        priority
      />
    </Link>
  );
}
