"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Masked line-by-line reveal. Pass text as an array of lines so the break
 * points are a design decision rather than whatever the viewport does.
 */
export default function SplitHeading({
  lines,
  as: Tag = "h2",
  className,
  delay = 0,
  onLoad = false,
}: {
  lines: (string | React.ReactNode)[];
  as?: "h1" | "h2" | "h3";
  className?: string;
  delay?: number;
  onLoad?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".reveal-line",
        { yPercent: 110 },
        {
          yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.09, delay,
          ...(onLoad
            ? {}
            : { scrollTrigger: { trigger: ref.current, start: "top 85%", once: true } }),
        }
      );
    }, ref);
    return () => ctx.revert();
  }, [delay, onLoad]);

  return (
    <Tag ref={ref as never} className={className}>
      {lines.map((l, i) => (
        <span key={i} className="reveal-mask">
          <span className="reveal-line">{l}</span>
        </span>
      ))}
    </Tag>
  );
}
