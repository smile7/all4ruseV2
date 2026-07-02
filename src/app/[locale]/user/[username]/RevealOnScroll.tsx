"use client";

import { useEffect, useRef } from "react";

type From = "bottom" | "left" | "right" | "scale";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Delay in ms before the transition fires after the element enters the viewport */
  delay?: number;
  from?: From;
};

const TRANSLATE: Record<From, string> = {
  bottom: "translateY(36px)",
  left: "translateX(-36px)",
  right: "translateX(36px)",
  scale: "scale(0.94)",
};

export function RevealOnScroll({
  children,
  className,
  delay = 0,
  from = "bottom",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setTimeout(() => {
          el.style.opacity = "1";
          el.style.transform = "none";
        }, delay);
        observer.unobserve(el);
      },
      { threshold: 0.08, rootMargin: "0px 0px -48px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: TRANSLATE[from],
        transition:
          "opacity 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.55s cubic-bezier(0.4,0,0.2,1)",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
