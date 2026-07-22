import type { Metadata } from "next";
import CTA from "@/components/site/CTA";
import Reveal from "@/components/site/Reveal";
import Impact from "@/components/site/Impact";
import { avatar, photos, gradientFor } from "@/lib/images";

export const metadata: Metadata = { title: "About" };

/** Edit these to your real team. Photos fall back to generated avatars. */
const TEAM = [
  { name: "Founder", role: "Lead & strategy", seed: "founder-nd" },
  { name: "Design", role: "UI / UX & brand", seed: "design-nd" },
  { name: "Engineering", role: "Web & apps", seed: "eng-nd" },
  { name: "Growth", role: "SEO & paid ads", seed: "growth-nd" },
];

const TIMELINE = [
  ["The itch", "Tired of agency work that stops at handover and never checks if it worked."],
  ["First builds", "A handful of sites for local businesses. Word got around that we actually finished."],
  ["The system", "Built our own way of running projects — written scope, staging from day one, real handovers."],
  ["Now", "A small team shipping for clients across a dozen countries, still on the same principles."],
];

const TECH = ["Next.js", "React", "TypeScript", "Supabase", "Node", "React Native",
  "Tailwind", "Figma", "Postgres", "AWS", "Vercel", "OpenAI"];

export default function AboutPage() {
  return (
    <>
      {/* intro */}
      <section className="shell py-24">
        <p className="drawer-label">About</p>
        <h1 className="mt-8 max-w-4xl text-[var(--text-h1)]">
          A small team that would rather ship than pitch.
        </h1>
      </section>

      {/* founder note — photo + text */}
      <section className="shell pb-20">
        <Reveal className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="card overflow-hidden">
            <div className="aspect-[4/5] w-full" style={{ background: gradientFor("founder") }}>
              {photos.founder ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos.founder} alt="Founder" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar("founder-note", "notionists")} alt="" className="h-40 w-40" />
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="drawer-label">Founder&apos;s note</p>
            <blockquote className="mt-6 space-y-5 text-lg leading-relaxed text-bone-200">
              <p>
                I started Nex Desk because too much agency work stops at the handover. A site
                gets built, the invoice clears, and nobody checks whether it actually did
                anything for the business.
              </p>
              <p>
                So we work differently. Everything is written down before it&apos;s built. You get
                a staging link in week one, not a reveal at the end. And when we&apos;re done, you
                own all of it — code, files, accounts. No lock-in.
              </p>
              <p>
                We&apos;re small on purpose. It means the person you talk to is the person doing
                the work.
              </p>
            </blockquote>
            <p className="mt-6 text-sm font-medium">— The Nex Desk team</p>
          </div>
        </Reveal>
      </section>

      <Impact />

      {/* how we work */}
      <section className="shell border-t border-ink-600 py-20">
        <p className="drawer-label">How we work</p>
        <Reveal className="mt-12 grid gap-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600 md:grid-cols-3">
          {[
            ["Written before verbal", "If it isn't in the agreement it isn't in the project. That protects you as much as us."],
            ["One person owns it", "Every project has a named lead on our side. You never chase a group inbox."],
            ["Scope changes are quoted", "Extra work gets a change order with the cost and days before we touch it."],
            ["You own the output", "Source code, design files and credentials transfer on final payment. No lock-in."],
            ["We say no", "If a project isn't a fit or the budget won't cover it properly, we say so."],
            ["Support is real", "One month free after launch, then a retainer if you want ongoing cover."],
          ].map(([t, b]) => (
            <div key={t} className="bg-ink-900 p-8">
              <h2 className="text-xl">{t}</h2>
              <p className="mt-3 text-sm leading-relaxed text-bone-400">{b}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* team */}
      <section className="shell border-t border-ink-600 py-20">
        <p className="drawer-label">The team</p>
        <h2 className="mt-6 max-w-2xl text-[var(--text-h2)]">The people at the desk.</h2>
        <Reveal className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <div key={m.seed} className="card overflow-hidden p-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar(m.seed, "notionists")} alt=""
                className="mx-auto h-24 w-24 rounded-full border border-ink-600 bg-ink-800" />
              <p className="mt-5 text-lg">{m.name}</p>
              <p className="mono-tag mt-1 justify-center">{m.role}</p>
            </div>
          ))}
        </Reveal>
        <p className="mono-tag mt-6">
          swap these for your real team — photos and names live in about/page.tsx
        </p>
      </section>

      {/* timeline */}
      <section className="shell border-t border-ink-600 py-20">
        <p className="drawer-label">How we got here</p>
        <Reveal className="mt-12 grid gap-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600 md:grid-cols-4">
          {TIMELINE.map(([t, b], i) => (
            <div key={t} className="bg-ink-900 p-7">
              <span className="mono-tag text-lime-400">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 text-lg">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-bone-400">{b}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* tech */}
      <section className="shell border-t border-ink-600 py-20">
        <p className="drawer-label">Our stack</p>
        <h2 className="mt-6 max-w-2xl text-[var(--text-h2)]">Tools we reach for.</h2>
        <div className="mt-10 flex flex-wrap gap-3">
          {TECH.map((t) => (
            <span key={t} className="rounded-full border border-ink-600 px-4 py-2 text-sm text-bone-200">
              {t}
            </span>
          ))}
        </div>
      </section>

      <CTA />
    </>
  );
}
