"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const STACK = [
  "Next.js", "React", "TypeScript", "Node", "Supabase", "Postgres", "Tailwind",
  "GSAP", "React Native", "Flutter", "Shopify", "WooCommerce", "Figma",
  "Google Ads", "Meta Ads", "GA4", "Vercel", "AWS", "OpenAI", "n8n",
];

export default function Marquee() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.to(".marquee-row", {
        xPercent: -50, duration: 34, ease: "none", repeat: -1,
      });
    }, ref);
    return () => ctx.revert();
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
