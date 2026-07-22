"use client";

import Link from "next/link";
import Reveal from "./Reveal";
import { BrowserFrame, DashboardMockup, MobileMockup } from "./mockups";
import { gradientFor } from "@/lib/images";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Case = {
  slug: string;
  title: string;
  client_name?: string | null;
  industry?: string | null;
  cover_url?: string | null;
  outcome?: string | null;
  metrics?: { label: string; value: string }[] | null;
};

/**
 * Featured work presented inside device frames. If a case study has a real
 * cover image it's shown in a browser frame; if not, a code-drawn mockup fills
 * in so the section always looks complete even before you've added screenshots.
 */
export default function WorkShowcase({ cases }: { cases: Case[] }) {
  if (!cases.length) return null;

  return (
    <section className="shell py-28">
      <div className="flex items-end justify-between gap-6">
        <div className="max-w-xl">
          <p className="drawer-label">Selected work</p>
          <h2 className="mt-6 text-[var(--text-h2)]">Live sites, real results.</h2>
        </div>
        <Link href="/work" className="btn hidden shrink-0 sm:inline-flex">All work</Link>
      </div>

      <Reveal className="mt-14 space-y-6">
        {cases.slice(0, 3).map((c, i) => (
          <Link
            key={c.slug}
            href={`/work/${c.slug}`}
            className="card group grid items-center gap-8 overflow-hidden p-8 lg:grid-cols-2"
          >
            {/* copy — alternates side on desktop */}
            <div className={i % 2 === 1 ? "lg:order-2" : ""}>
              <div className="flex items-center gap-3">
                <span className="mono-tag">{c.industry ?? "Project"}</span>
                <span className="mono-tag">·</span>
                <span className="mono-tag">{c.client_name}</span>
              </div>
              <h3 className="mt-4 text-3xl">{c.title}</h3>
              <p className="mt-4 text-bone-400">{c.outcome}</p>

              {!!c.metrics?.length && (
                <div className="mt-8 flex gap-10">
                  {c.metrics.slice(0, 3).map((m) => (
                    <div key={m.label}>
                      <p className="text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{m.value}</p>
                      <p className="mono-tag mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <span className="mt-8 inline-flex items-center gap-2 text-sm text-lime-400">
                View case study
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </div>

            {/* visual */}
            <div className={i % 2 === 1 ? "lg:order-1" : ""}>
              <BrowserFrame url={`${c.slug}.com`}>
                {c.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover_url} alt="" className="aspect-[16/10] w-full object-cover" />
                ) : i % 2 === 0 ? (
                  <DashboardMockup />
                ) : (
                  <div className="grid aspect-[16/10] place-items-center p-6" style={{ background: gradientFor(c.slug) }}>
                    <MobileMockup />
                  </div>
                )}
              </BrowserFrame>
            </div>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}
