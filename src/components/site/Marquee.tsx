"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const STACK = [
  "Next.js", "React", "TypeScript", "Node", "Supabase", "Postgres", "Tailwind",
  "GSAP", "React Native", "Flutter", "Shopify", "WooCommerce", "Figma",
  "Google Ads", "Meta Ads", "GA4", "Vercel", "AWS", "OpenAI", "n8n", "WordPress", "SEO",
];

export default function Marquee() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;

    const tween = gsap.to(".marquee-row", {
      xPercent: -50,
      duration: 80,
      ease: "none",
      repeat: -1,
    });

    // Hover — pause while mouse is over
    const pause = () => tween.pause();
    const resume = () => tween.resume();
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);

    // Touch — pause on contact, resume 900ms after finger lifts
    let resumeTimer: ReturnType<typeof setTimeout>;
    const onTouchStart = () => {
      clearTimeout(resumeTimer);
      tween.pause();
    };
    const onTouchEnd = () => {
      resumeTimer = setTimeout(() => tween.resume(), 900);
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      tween.kill();
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      clearTimeout(resumeTimer);
    };
  }, []);

  return (
    <section ref={ref} className="overflow-hidden border-y border-ink-600 py-6">
      <div className="marquee-row flex w-max gap-10 whitespace-nowrap">
        {[...STACK, ...STACK].map((t, i) => (
          <span key={i} className="mono-tag flex items-center gap-10">
            {t}
            <span className="h-1 w-1 bg-lime-400" aria-hidden />
          </span>
        ))}
      </div>
    </section>
  );
}
