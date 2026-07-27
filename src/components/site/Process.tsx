"use client";

import Reveal from "./Reveal";
import { HOMEPAGE_PROCESS_STEPS } from "@/config/siteContent";

export default function Process() {
  const STEPS = HOMEPAGE_PROCESS_STEPS;
  return (
    <section className="shell py-12">
      <p className="drawer-label">How it goes</p>
      <h2 className="mt-6 max-w-2xl text-[var(--text-h2)]">
        Six steps. You always know which one you&apos;re on.
      </h2>

      <Reveal direction="up" distance={24} stagger={0.06} className="mt-10 grid gap-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <div
            key={title}
            className="group relative bg-ink-900 p-8 transition-all duration-300 hover:bg-ink-800"
          >
            <div className="flex items-center justify-between">
              <span className="mono-tag text-lime-400 group-hover:scale-110 transition-transform">{String(i + 1).padStart(2, "0")}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400/30 group-hover:bg-lime-400 transition-colors" />
            </div>
            <h3 className="mt-5 text-2xl group-hover:text-bone-50 transition-colors">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-bone-400">{body}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
