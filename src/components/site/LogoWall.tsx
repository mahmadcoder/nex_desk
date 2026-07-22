"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const STACK = [
  "Next.js 15",
  "React",
  "TypeScript",
  "Supabase",
  "Node.js",
  "React Native",
  "TailwindCSS",
  "Figma",
  "PostgreSQL",
  "AWS",
  "Vercel",
  "OpenAI",
];

export default function LogoWall() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.to(".lw-row", { xPercent: -50, duration: 32, ease: "none", repeat: -1 });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="border-b border-ink-600 py-10 bg-ink-950/40">
      <div className="shell flex items-center justify-between mb-6">
        <p className="mono-tag text-lime-400">Our Stack</p>
        <p className="mono-tag text-xs text-bone-400">Production Ready Technologies</p>
      </div>
      <div ref={ref} className="overflow-hidden">
        <div className="lw-row flex w-max items-center gap-14 whitespace-nowrap px-[var(--gutter)]">
          {[...STACK, ...STACK].map((tech, i) => (
            <span
              key={i}
              className="text-xl font-mono tracking-tight text-bone-300/70 transition-colors hover:text-lime-400 flex items-center gap-3"
            >
              <span className="text-lime-400/50 text-xs">⚡</span>
              <span>{tech}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
