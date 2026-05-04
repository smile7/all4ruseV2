import Image from "next/image";

import { Link } from "~/i18n/navigation";

export function Logo() {
  return (
    <Link href="/">
      <Image
        src="/all4ruse_black.png"
        alt="All4Ruse"
        width={120}
        height={40}
        className="theme-logo-light h-10 w-auto object-contain"
        priority
      />
      <Image
        src="/all4ruse_white.png"
        alt="All4Ruse"
        width={120}
        height={40}
        className="theme-logo-dark h-10 w-auto object-contain"
        priority
      />
    </Link>
  );
}
