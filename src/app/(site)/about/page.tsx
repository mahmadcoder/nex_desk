import type { Metadata } from "next";
import CTA from "@/components/site/CTA";
import Reveal from "@/components/site/Reveal";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <section className="shell py-24">
        <p className="drawer-label">About</p>
        <h1 className="mt-8 max-w-4xl text-[var(--text-h1)]">
          A small team that would rather ship than pitch.
        </h1>
        <div className="mt-10 grid max-w-4xl gap-8 text-lg leading-relaxed text-bone-200 md:grid-cols-2">
          <p>
            Nex Desk started because too much agency work stops at the handover. A site
            gets built, the invoice clears, and nobody checks whether it actually did
            anything for the business.
          </p>
          <p>
            So we work differently. Fixed scope written down before we start. A staging
            link from week one. Weekly progress emails whether or not you ask. And a
            handover document that means you own everything outright.
          </p>
        </div>
      </section>

      <section className="shell border-t border-ink-600 py-20">
        <p className="drawer-label">How we work</p>
        <Reveal className="mt-12 grid gap-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600 md:grid-cols-3">
          {[
            ["Written before verbal", "If it isn't in the agreement it isn't in the project. That protects you as much as us."],
            ["One person owns it", "Every project has a named lead on our side. You never chase a group inbox."],
            ["Scope changes are quoted", "Extra work gets a change order with the cost and the extra days before we touch it."],
            ["You own the output", "Source code, design files and credentials transfer on final payment. No lock-in."],
            ["We say no", "If a project isn't a fit or the budget won't cover it properly, we say so instead of underdelivering."],
            ["Support is real", "One month free after launch, then a retainer if you want ongoing cover."],
          ].map(([t, b]) => (
            <div key={t} className="bg-ink-900 p-8">
              <h2 className="text-xl">{t}</h2>
              <p className="mt-3 text-sm leading-relaxed text-bone-400">{b}</p>
            </div>
          ))}
        </Reveal>
      </section>
      <CTA />
    </>
  );
}
