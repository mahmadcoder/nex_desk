"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Scroll-triggered reveal. Wrap anything; children stagger in. */
export default function Reveal({
  children,
  y = 28,
  stagger = 0.08,
  className,
}: {
  children: React.ReactNode;
  y?: number;
  stagger?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(ref.current?.children ?? [], { opacity: 1, y: 0 });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current!.children,
        { opacity: 0, y },
        {
          opacity: 1, y: 0, duration: 0.9, stagger, ease: "expo.out",
          scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
        }
      );
    }, ref);
    return () => ctx.revert();
  }, [y, stagger]);

  return <div ref={ref} className={className}>{children}</div>;
}
