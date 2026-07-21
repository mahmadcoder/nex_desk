"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Service = {
  slug: string;
  title: string;
  category: string;
  short_desc: string | null;
  starting_at: number | null;
};

export default function ServicesScroll({ services }: { services: Service[] }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [sectionHeight, setSectionHeight] = useState<string>("auto");

  // 1. Detect device viewport
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleMq = () => {
      setIsDesktop(mq.matches && !reduced.matches);
    };

    handleMq();
    mq.addEventListener("change", handleMq);
    reduced.addEventListener("change", handleMq);

    return () => {
      mq.removeEventListener("change", handleMq);
      reduced.removeEventListener("change", handleMq);
    };
  }, []);

  // 2. Measure & set container height on desktop
  useEffect(() => {
    if (!isDesktop || !track.current) {
      setSectionHeight("auto");
      return;
    }

    const setHeight = () => {
      if (!track.current) return;
      const travel = track.current.scrollWidth - window.innerWidth + 80;
      setSectionHeight(`${travel + window.innerHeight}px`);
    };

    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, [isDesktop, services.length]);

  // 3. Scroll driver — translates track horizontally as user scrolls
  useEffect(() => {
    if (!isDesktop) return;

    const onScroll = () => {
      const el = root.current;
      const tr = track.current;
      if (!el || !tr) return;

      const { top, height } = el.getBoundingClientRect();
      const scrollable = height - window.innerHeight;
      if (scrollable <= 0) return;

      const progress = Math.max(0, Math.min(1, -top / scrollable));
      const maxX = tr.scrollWidth - window.innerWidth + 80;
      tr.style.transform = `translateX(${-progress * maxX}px)`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDesktop, sectionHeight]);

  const cards = services.map((s, i) => (
    <Link
      key={s.slug}
      href={`/services/${s.slug}`}
      className={`card group flex shrink-0 flex-col justify-between p-7 transition-colors
                  hover:border-lime-400/40
                  ${isDesktop ? "w-[340px]" : "w-full"}`}
    >
      <div>
        <div className="flex items-baseline justify-between">
          <span className="mono-tag">{s.category}</span>
          <span className="mono-tag">{String(i + 1).padStart(2, "0")}</span>
        </div>
        <h3 className="mt-6 text-[1.6rem]">{s.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-bone-400">{s.short_desc}</p>
      </div>
      <div className="mt-10 flex items-center justify-between border-t border-ink-600 pt-5">
        <span className="mono-tag">
          {s.starting_at ? `from Rs ${s.starting_at.toLocaleString()}` : "on request"}
        </span>
        <span className="text-lime-400 transition-transform group-hover:translate-x-1">→</span>
      </div>
    </Link>
  ));

  // ── Desktop: sticky viewport with scroll-driven translateX ──────────────
  if (isDesktop) {
    return (
      <div ref={root} style={{ height: sectionHeight }}>
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="shell pt-16 pb-8">
            <p className="drawer-label">What we do</p>
            <h2 className="mt-6 max-w-3xl text-[var(--text-h2)]">
              Sixteen services. Most clients need three of them.
            </h2>
          </div>
          <div
            ref={track}
            className="flex gap-5 px-[var(--gutter)] will-change-transform"
            style={{ transform: "translateX(0)" }}
          >
            {cards}
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile / tablet: native horizontal scroll with snap ────────────────
  return (
    <section className="relative py-16" suppressHydrationWarning>
      <div className="shell" suppressHydrationWarning>
        <p className="drawer-label">What we do</p>
        <h2 className="mt-6 max-w-3xl text-[var(--text-h2)]">
          Sixteen services. Most clients need three of them.
        </h2>
      </div>

      <div
        className="mt-10 flex gap-4 overflow-x-auto px-[var(--gutter)] pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
        suppressHydrationWarning
      >
        {services.map((s, i) => (
          <Link
            key={s.slug}
            href={`/services/${s.slug}`}
            className="card group flex w-[300px] shrink-0 snap-start flex-col justify-between p-7
                       transition-colors hover:border-lime-400/40"
          >
            <div>
              <div className="flex items-baseline justify-between">
                <span className="mono-tag">{s.category}</span>
                <span className="mono-tag">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-6 text-[1.6rem]">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-bone-400">{s.short_desc}</p>
            </div>
            <div className="mt-10 flex items-center justify-between border-t border-ink-600 pt-5">
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
