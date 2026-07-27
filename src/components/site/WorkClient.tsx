"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TexturePanel from "@/components/site/mockups/TexturePanel";
import { BrowserFrame, DashboardMockup, MobileMockup } from "@/components/site/mockups";
import { textureFor } from "@/lib/images";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type WorkCase = {
  slug: string;
  title: string;
  client_name?: string | null;
  industry?: string | null;
  cover_url?: string | null;
  outcome?: string | null;
  metrics?: { label: string; value: string }[] | null;
  tech_stack?: string[] | null;
};

interface WorkClientProps {
  cases: WorkCase[];
}

export default function WorkClient({ cases }: WorkClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Extract unique categories/industries from cases
  const categories = ["All", ...Array.from(new Set(cases.map((c) => c.industry).filter(Boolean))) as string[]];

  // Filter cases based on active category
  const filteredCases = selectedCategory === "All"
    ? cases
    : cases.filter((c) => c.industry === selectedCategory);

  return (
    <>
      {/* Hero Header */}
      <section className="shell pt-24 pb-12">
        <div className="max-w-3xl">
          <p className="drawer-label">Work</p>
          <h1 className="mt-6 text-3xl sm:text-5xl font-bold tracking-tight text-bone-50 leading-tight">
            Shipped, live, and still running.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-bone-300 leading-relaxed max-w-2xl">
            A few of the things that have left the desk. Real builds, real numbers.
          </p>
        </div>

        {/* Interactive Filter Chips */}
        {categories.length > 1 && (
          <div className="mt-10 flex flex-wrap gap-2.5 items-center border-b border-ink-700/80 pb-6">
            {categories.map((cat) => {
              const count = cat === "All" ? cases.length : cases.filter((c) => c.industry === cat).length;
              const isActive = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? "bg-lime-400 text-ink-950 border-lime-400 font-bold"
                      : "bg-ink-900/80 text-bone-300 border-ink-600 hover:border-bone-400 hover:text-bone-50 hover:bg-ink-800"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-ink-950/20 text-ink-950 font-bold" : "bg-ink-800 text-bone-400"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Grid of Case Studies */}
      <section className="shell pb-24">
        {filteredCases.length === 0 ? (
          <div className="card p-12 text-center my-8">
            <p className="text-bone-400 text-sm">No projects found in this category.</p>
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className="mt-4 btn btn-primary text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {filteredCases.map((c, i) => (
              <Link
                key={c.slug}
                href={`/work/${c.slug}`}
                className="card group flex flex-col overflow-hidden border-ink-600 bg-ink-900/70 transition-colors hover:border-ink-500"
              >
                {/* Texture Cover Panel & Device Frame with Image Zoom ONLY */}
                <div className="relative overflow-hidden">
                  <TexturePanel src={textureFor(c.slug)} className="p-6" overlay={0.78}>
                    <BrowserFrame url={`${c.slug}.com`}>
                      <div className="overflow-hidden">
                        {c.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.cover_url}
                            alt={c.title}
                            className="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                        ) : i % 2 === 0 ? (
                          <div className="transition-transform duration-500 ease-out group-hover:scale-105">
                            <DashboardMockup />
                          </div>
                        ) : (
                          <div className="grid aspect-[16/10] place-items-center bg-ink-800 transition-transform duration-500 ease-out group-hover:scale-105">
                            <MobileMockup />
                          </div>
                        )}
                      </div>
                    </BrowserFrame>
                  </TexturePanel>

                  {/* Top Industry Badge Overlay */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className="mono-tag text-[10px] text-bone-200 bg-ink-950/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-ink-700 font-medium">
                      {c.industry ?? "Case Study"}
                    </span>
                  </div>
                </div>

                {/* Content Details Body */}
                <div className="flex flex-1 flex-col p-7">
                  <div className="flex items-center gap-2">
                    <span className="mono-tag text-bone-300 font-semibold">{c.client_name}</span>
                  </div>

                  <h2 className="mt-2.5 text-2xl font-semibold text-bone-50">
                    {c.title}
                  </h2>

                  <p className="mt-3 text-xs sm:text-sm text-bone-400 leading-relaxed flex-1">
                    {c.outcome}
                  </p>

                  {/* Metrics Row */}
                  {!!(c.metrics as any[])?.length && (
                    <div className="mt-6 grid grid-cols-3 gap-4 border-t border-ink-700/80 pt-4">
                      {(c.metrics as any[]).slice(0, 3).map((m) => (
                        <div key={m.label}>
                          <p className="text-xl sm:text-2xl font-bold text-bone-50 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                            {m.value}
                          </p>
                          <p className="mono-tag text-[10px] text-bone-400 mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tech Stack Chips */}
                  {!!c.tech_stack?.length && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {c.tech_stack.slice(0, 4).map((tech) => (
                        <span key={tech} className="text-[10px] mono-tag bg-ink-800 text-bone-300 px-2 py-0.5 rounded border border-ink-700">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* View Link */}
                  <div className="mt-6 pt-4 border-t border-ink-700/60 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-lime-400">
                      View Case Study
                      <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1.5" />
                    </span>
                    <span className="text-[10px] mono-tag text-bone-400">
                      Full Scope & Specs →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
