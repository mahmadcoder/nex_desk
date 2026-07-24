"use client";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const STATS = [
  ["60", "+", "Projects shipped"],
  ["4", "wk", "Average delivery"],
  ["82", "%", "Client retention"],
  ["12", "", "Countries served"],
] as const;

/** Counters that roll up when the band scrolls into view. */
export default function Impact() {
  const ref = useRef<HTMLElement>(null);
  const [vals, setVals] = useState(STATS.map(() => 0));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVals(STATS.map((s) => Number(s[0])));
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const proxy = STATS.map(() => ({ v: 0 }));
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top 80%",
        once: true,
        onEnter: () =>
          proxy.forEach((p, i) =>
            gsap.to(p, {
              v: Number(STATS[i][0]),
              duration: 1.6,
              ease: "power2.out",
              onUpdate: () => setVals((prev) => prev.map((x, j) => (j === i ? Math.round(p.v) : x))),
            })
          ),
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="shell py-16">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {STATS.map(([, suffix, label], i) => (
          <div
            key={label}
            className="card relative overflow-hidden p-8 text-center border-ink-600/80 bg-ink-900/90 hover:border-lime-400/50 hover:bg-ink-800/80 transition-all duration-300 group"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-lime-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <p
              className="text-[clamp(2.5rem,5vw,4rem)] font-medium leading-none tracking-tighter text-bone-50"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {vals[i]}
              <span className="text-lime-400 font-normal ml-0.5">{suffix}</span>
            </p>
            <p className="mono-tag mt-4 text-xs justify-center text-bone-400 group-hover:text-bone-200 transition-colors">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
