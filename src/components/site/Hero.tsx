"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import SplitHeading from "./SplitHeading";
import Magnetic from "./Magnetic";

const STATS = [
  { label: "Projects shipped", target: 60, suffix: "+" },
  { label: "Avg. delivery", target: 4, suffix: " weeks" },
  { label: "Client retention", target: 82, suffix: "%" },
  { label: "Time to reply", prefix: "< ", target: 1, suffix: " day" },
];

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const statRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      // 1. Entrance animation
      gsap.fromTo(
        "[data-hero-fade]",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.12, delay: 0.2, ease: "power3.out" }
      );

      // 2. Count-up stats animation
      STATS.forEach((stat, i) => {
        const el = statRefs.current[i];
        if (!el) return;

        const obj = { val: 0 };
        gsap.to(obj, {
          val: stat.target,
          duration: 2,
          delay: 0.5 + i * 0.1,
          ease: "power2.out",
          onUpdate: () => {
            const formatted = Math.round(obj.val);
            el.textContent = `${stat.prefix ?? ""}${formatted}${stat.suffix ?? ""}`;
          },
        });
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="shell flex min-h-[calc(100vh-72px)] flex-col justify-center py-16">
      <p data-hero-fade className="drawer-label">Pakistan · working worldwide</p>

      <SplitHeading
        as="h1"
        onLoad
        delay={0.3}
        className="mt-12 text-[var(--text-hero)]"
        lines={[
          "We build it,",
          <>we ship it,</>,
          <span key="k" className="text-bone-400">we stay.</span>,
        ]}
      />

      <div className="mt-9 grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-end">
        <p data-hero-fade className="max-w-lg text-lg text-bone-200">
          Nex Desk is a software agency. Websites, apps, and the design and marketing
          that make them worth building. Fixed scope, written agreement, and a link
          where you can watch it happen.
        </p>

        <div data-hero-fade className="flex flex-wrap gap-3 md:justify-end">
          <Magnetic strength={0.25}>
            <Link href="/contact" className="btn btn-primary">Start a project</Link>
          </Magnetic>
          <Magnetic strength={0.25}>
            <Link href="/work" className="btn">See the work</Link>
          </Magnetic>
        </div>
      </div>

      <div data-hero-fade className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600 sm:grid-cols-4">
        {STATS.map((stat, i) => (
          <div key={stat.label} className="bg-ink-900 p-6 transition-colors hover:bg-ink-800">
            <p className="mono-tag">{stat.label}</p>
            <p
              ref={(el) => { statRefs.current[i] = el; }}
              className="mt-2 text-3xl tracking-tight text-bone-50"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {stat.prefix ?? ""}0{stat.suffix ?? ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
