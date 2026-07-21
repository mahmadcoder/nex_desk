"use client";
import Link from "next/link";
import { useRef } from "react";

type Service = {
  slug: string;
  title: string;
  category: string;
  short_desc: string | null;
  starting_at: number | null;
};

export default function ServicesScroll({ services }: { services: Service[] }) {
  const track = useRef<HTMLDivElement>(null);

  return (
    <section className="relative overflow-hidden py-28" suppressHydrationWarning>
      <div className="shell" suppressHydrationWarning>
        <p className="drawer-label">What we do</p>
        <h2 className="mt-6 max-w-3xl text-[var(--text-h2)]">
          Sixteen services. Most clients need three of them.
        </h2>
      </div>

      {/* Scrollable track — native overflow scroll, no GSAP DOM pinning */}
      <div
        ref={track}
        className="mt-14 flex gap-5 overflow-x-auto px-[var(--gutter)] pb-4
                   scrollbar-none snap-x snap-mandatory
                   max-lg:grid max-lg:grid-cols-1 max-lg:gap-4 max-lg:overflow-x-visible
                   sm:max-lg:grid-cols-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        suppressHydrationWarning
      >
        {services.map((s, i) => (
          <Link
            key={s.slug}
            href={`/services/${s.slug}`}
            className="card group flex w-[340px] shrink-0 snap-start flex-col justify-between p-7
                       transition-colors hover:border-lime-400/40 max-lg:w-auto"
          >
            <div suppressHydrationWarning>
              <div className="flex items-baseline justify-between" suppressHydrationWarning>
                <span className="mono-tag">{s.category}</span>
                <span className="mono-tag">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-6 text-[1.6rem]">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-bone-400">{s.short_desc}</p>
            </div>
            <div
              className="mt-10 flex items-center justify-between border-t border-ink-600 pt-5"
              suppressHydrationWarning
            >
              <span className="mono-tag">
                {s.starting_at ? `from Rs ${s.starting_at.toLocaleString()}` : "on request"}
              </span>
              <span className="text-lime-400 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
