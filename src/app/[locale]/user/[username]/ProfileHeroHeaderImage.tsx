"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  color: string;
};

export function ProfileHeroHeaderImage({ src, alt, color }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    const overlay = overlayRef.current;
    if (!el || !wrapper || !inner || !overlay) return;

    let rafId: number;

    const update = () => {
      const mobile = window.matchMedia("(max-width: 639px)").matches;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh;
      const end = vh * (mobile ? 0.5 : 0.2);

      let progress = (start - rect.top) / (start - end);
      progress = Math.min(Math.max(progress, 0), 1);

      const maxTilt = mobile ? 18 : 20;
      const minScale = mobile ? 0.86 : 0.85;
      const maxTranslate = mobile ? 28 : 30;

      const tilt = maxTilt * (1 - progress);
      const scale = minScale + progress * (1 - minScale);
      const translateY = maxTranslate * (progress - 1);

      wrapper.style.transform = `translateY(${translateY}px) scale(${scale})`;
      inner.style.transform = `rotateX(${tilt}deg)`;
      overlay.style.opacity = String(tilt / maxTilt);

      if (!mobile) {
        const insetX = 9 * (1 - progress);
        inner.style.clipPath = `polygon(${insetX}% 0%, ${100 - insetX}% 0%, 100% 100%, 0% 100%)`;
        inner.style.height = "min(60vh, 700px)";
      } else {
        const insetX = 5 * (1 - progress);
        inner.style.clipPath = `polygon(${insetX}% 0%, ${100 - insetX}% 0%, 100% 100%, 0% 100%)`;
        inner.style.height = "";
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-7xl overflow-visible px-4 pb-6 sm:px-8 sm:pb-0"
    >
      <div
        ref={wrapperRef}
        className="mx-auto w-full will-change-transform"
        style={{ perspective: "1200px" }}
      >
        <div
          ref={innerRef}
          className="bg-muted/40 relative mx-auto aspect-video max-h-[42svh] w-full overflow-hidden rounded-2xl shadow-2xl sm:aspect-auto sm:max-h-none sm:rounded-3xl sm:bg-transparent"
          style={{
            transformOrigin: "50% 0%",
            boxShadow: `0 40px 80px -20px ${color}66, 0 0 0 1px rgba(255,255,255,0.08) inset`,
          }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority
            className="object-contain sm:object-cover"
            sizes="(max-width: 640px) 100vw, 1280px"
          />
          <div
            ref={overlayRef}
            className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-transparent sm:from-black/60"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-px bg-white/30"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
