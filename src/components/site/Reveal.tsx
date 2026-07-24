"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export interface RevealProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right" | "zoom";
  distance?: number;
  stagger?: number;
  duration?: number;
  delay?: number;
  className?: string;
  start?: string;
}

/**
 * Powerful GSAP ScrollTrigger reveal component.
 * Supports directional entrance, scaling, and staggered child animations.
 */
export default function Reveal({
  children,
  direction = "up",
  distance = 32,
  stagger = 0.08,
  duration = 0.9,
  delay = 0,
  className,
  start = "top 85%",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(ref.current.children, { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    let fromVars: gsap.TweenVars = { opacity: 0 };
    switch (direction) {
      case "up":
        fromVars.y = distance;
        break;
      case "down":
        fromVars.y = -distance;
        break;
      case "left":
        fromVars.x = distance;
        break;
      case "right":
        fromVars.x = -distance;
        break;
      case "zoom":
        fromVars.scale = 0.92;
        fromVars.y = 16;
        break;
    }

    const ctx = gsap.context(() => {
      const targets = ref.current?.children ? Array.from(ref.current.children) : [ref.current];

      gsap.fromTo(
        targets,
        fromVars,
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration,
          delay,
          stagger: targets.length > 1 ? stagger : 0,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start,
            once: true,
          },
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [direction, distance, stagger, duration, delay, start]);

  return <div ref={ref} className={className}>{children}</div>;
}
