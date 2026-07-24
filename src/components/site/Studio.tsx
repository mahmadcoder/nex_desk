"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import TexturePanel from "./mockups/TexturePanel";
import { BrowserFrame, DashboardMockup, MobileMockup, SeoMockup } from "./mockups";
import { textures } from "@/lib/images";

/**
 * "Everything under one roof" — an interactive selector. Pick a discipline on
 * the left and the panel on the right swaps to show what that work looks like.
 * Replaces the old bento grid with something that invites a click and reads as
 * a single studio that covers the whole journey, not four disconnected cards.
 */

const AREAS = [
  {
    key: "design",
    label: "Strategy & design",
    line: "Brand, UX and interfaces designed around what your customer is trying to do.",
    points: ["Brand & identity systems", "UX research and flows", "High-fidelity UI in Figma"],
    href: "/services/web-design",
    tex: textures.blue,
    visual: (
      <BrowserFrame url="figma.com/nexdesk">
        <div className="grid grid-cols-3 gap-2 bg-ink-900 p-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square rounded-lg border border-ink-600"
              style={{ background: i % 2 ? "var(--color-ink-800)" : "var(--color-ink-700)" }} />
          ))}
        </div>
      </BrowserFrame>
    ),
  },
  {
    key: "build",
    label: "Web & app build",
    line: "Fast, secure sites, web apps and mobile apps built to your exact spec.",
    points: ["Next.js & React web apps", "iOS / Android from one codebase", "Custom CMS & admin panels"],
    href: "/services/web-development",
    tex: textures.dark,
    visual: (
      <BrowserFrame url="app.yourbrand.com">
        <DashboardMockup />
      </BrowserFrame>
    ),
  },
  {
    key: "launch",
    label: "Launch & handover",
    line: "Deployment, domains and a handover pack that transfers everything to you.",
    points: ["CI/CD & cloud setup", "Signed agreement & handover PDFs", "You own all the code"],
    href: "/services/hosting-devops",
    tex: textures.green,
    visual: (
      <div className="grid place-items-center rounded-xl border border-ink-600 p-8" style={{ background: "var(--color-ink-800)" }}>
        <MobileMockup />
      </div>
    ),
  },
  {
    key: "grow",
    label: "Growth & SEO",
    line: "Once it's live, the SEO, ads and analytics that actually move the numbers.",
    points: ["Technical & local SEO", "Google / Meta ad campaigns", "GA4, funnels & CRO"],
    href: "/services/seo",
    tex: textures.blue,
    visual: (
      <div className="overflow-hidden rounded-xl border border-ink-600">
        <SeoMockup />
      </div>
    ),
  },
];

export default function Studio() {
  const [active, setActive] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const a = AREAS[active];

  useEffect(() => {
    if (!previewRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      previewRef.current,
      { opacity: 0.4, scale: 0.97, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );
  }, [active]);

  return (
    <section className="shell py-14">
      <div className="max-w-2xl">
        <p className="drawer-label">One studio, every layer</p>
        <h2 className="mt-6 text-[var(--text-h2)]">
          From the first sketch to the tenth thousand visitor.
        </h2>
        <p className="mt-5 text-bone-400">
          Most projects touch three or four of these. You brief one team and it all
          connects — no handoffs between agencies, no gaps where things fall through.
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* selector */}
        <div className="flex flex-col divide-y divide-ink-600 border-y border-ink-600">
          {AREAS.map((area, i) => {
            const on = i === active;
            return (
              <button
                key={area.key}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="group py-6 text-left transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-4">
                    <span className={`mono-tag transition-colors ${on ? "text-lime-400" : ""}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={`text-2xl tracking-tight transition-colors ${on ? "text-bone-50" : "text-bone-400"}`}
                      style={{ fontFamily: "var(--font-display)" }}>
                      {area.label}
                    </span>
                  </span>
                  <span className={`text-lime-400 transition-all ${on ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"}`}>→</span>
                </div>

                {/* expanded detail */}
                <div className={`grid transition-all duration-300 ${on ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="max-w-md text-sm text-bone-300">{area.line}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {area.points.map((p) => (
                        <li key={p} className="rounded-full border border-ink-600 px-3 py-1 text-xs text-bone-400">{p}</li>
                      ))}
                    </ul>
                    <Link href={area.href} className="mono-tag mt-4 inline-flex text-lime-400 hover:underline">
                      explore →
                    </Link>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* preview */}
        <div ref={previewRef}>
          <TexturePanel src={a.tex} className="min-h-[420px] rounded-2xl border border-ink-600" overlay={0.8}>
            <div className="flex h-full flex-col justify-between gap-8 p-8">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                <span className="mono-tag">{a.label}</span>
              </div>
              <div>{a.visual}</div>
            </div>
          </TexturePanel>
        </div>
      </div>
    </section>
  );
}
