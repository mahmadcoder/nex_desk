"use client";

import Link from "next/link";
import Reveal from "./Reveal";
import { BrowserFrame, DashboardMockup, MobileMockup, CodeMockup, SeoMockup } from "./mockups";

/**
 * The "what we actually make" section — a bento grid where every card shows a
 * real interface drawn in code rather than a stock photo. This is the visual
 * centrepiece of the home page and the thing that makes the site feel like a
 * product studio instead of a template.
 */
export default function Capabilities() {
  return (
    <section className="shell py-28">
      <div className="max-w-2xl">
        <p className="drawer-label">What we make</p>
        <h2 className="mt-6 text-[var(--text-h2)]">
          Not slides about work. The work.
        </h2>
        <p className="mt-5 text-bone-400">
          Websites, apps, dashboards and the growth systems around them. Here&apos;s the
          kind of thing that leaves our desk.
        </p>
      </div>

      <Reveal className="mt-14 grid gap-4 md:grid-cols-6 md:grid-rows-2">
        {/* big: web app */}
        <div className="card group flex flex-col overflow-hidden p-6 md:col-span-4 md:row-span-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="mono-tag">Web apps & sites</span>
              <h3 className="mt-3 text-2xl">Interfaces people actually finish using</h3>
            </div>
            <Link href="/services/web-development" className="text-lime-400 transition-transform group-hover:translate-x-1">→</Link>
          </div>
          <div className="mt-8 flex-1">
            <BrowserFrame url="app.yourbrand.com">
              <DashboardMockup />
            </BrowserFrame>
          </div>
        </div>

        {/* mobile */}
        <div className="card group flex flex-col overflow-hidden p-6 md:col-span-2">
          <div className="flex items-start justify-between">
            <span className="mono-tag">Mobile</span>
            <Link href="/services/mobile-apps" className="text-lime-400 transition-transform group-hover:translate-x-1">→</Link>
          </div>
          <div className="mt-6 flex-1">
            <MobileMockup />
          </div>
        </div>

        {/* seo */}
        <div className="card group flex flex-col overflow-hidden p-6 md:col-span-2">
          <div className="flex items-start justify-between">
            <span className="mono-tag">SEO & growth</span>
            <Link href="/services/seo" className="text-lime-400 transition-transform group-hover:translate-x-1">→</Link>
          </div>
          <div className="mt-6 flex-1 overflow-hidden rounded-xl border border-ink-600">
            <SeoMockup />
          </div>
        </div>
      </Reveal>

      {/* thin code strip */}
      <Reveal className="mt-4 grid gap-4 md:grid-cols-6">
        <div className="card overflow-hidden md:col-span-4">
          <CodeMockup />
        </div>
        <div className="card flex flex-col justify-center p-6 md:col-span-2">
          <p className="text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Shipped, not shelved</p>
          <p className="mt-3 text-sm text-bone-400">
            Every project goes live. We don&apos;t do endless discovery decks — we build,
            deploy, and hand you the keys.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
