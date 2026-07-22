"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import SplitHeading from "./SplitHeading";

export default function Hero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-hero-fade]",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, delay: 0.2, ease: "expo.out" }
      );
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
          <Link href="/contact" className="btn btn-primary">Start a project</Link>
          <Link href="/work" className="btn">See the work</Link>
        </div>
      </div>

      <div data-hero-fade className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600 sm:grid-cols-4">
        {[
          ["Projects shipped", "60+"],
          ["Avg. delivery", "4 weeks"],
          ["Client retention", "82%"],
          ["Time to first reply", "< 1 day"],
        ].map(([label, value]) => (
          <div key={label} className="bg-ink-900 p-6">
            <p className="mono-tag">{label}</p>
            <p className="mt-2 text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
