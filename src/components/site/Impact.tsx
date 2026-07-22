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
    <section ref={ref} className="border-y border-ink-600 bg-ink-950">
      <div className="shell grid grid-cols-2 gap-px bg-ink-600 lg:grid-cols-4">
        {STATS.map(([, suffix, label], i) => (
          <div key={label} className="bg-ink-950 px-6 py-14 text-center">
            <p className="text-[clamp(2.5rem,6vw,4.5rem)] leading-none tracking-tighter"
              style={{ fontFamily: "var(--font-display)" }}>
              {vals[i]}<span className="text-lime-400">{suffix}</span>
            </p>
            <p className="mono-tag mt-4 justify-center">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
