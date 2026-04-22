"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

function LogoInner() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Link href="/" aria-label="All4Ruse — начало">
      <Image
        src={isDark ? "/all4ruse_white.png" : "/all4ruse_black.png"}
        alt="All4Ruse"
        width={120}
        height={40}
        className="h-8 w-auto object-contain"
        priority
      />
    </Link>
  );
}

const Logo = dynamic(() => Promise.resolve(LogoInner), {
  ssr: false,
  loading: () => (
    <div className="h-8 w-[120px]" aria-hidden />
  ),
});

export { Logo };
