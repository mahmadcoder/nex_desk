import Link from "next/link";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import Reveal from "@/components/site/Reveal";
import CTA from "@/components/site/CTA";
import FeatureList from "@/components/site/FeatureList";
import { money } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };
export const revalidate = 300;

import { demoServices } from "@/lib/agencyData";
/**
 * Three signature engagement tiers. They live in config rather than here
 * because the homepage teaser shows the same three, and two copies drift.
 *
 * Each floor is computed against the catalogue below rather than hand-written.
 * The old ranges ("$4,000 – $8,000") were heard as their lowest number anyway,
 * and worse, they undercut the per-service grid further down this same page.
 */
import { TIERS, tierFrom } from "@/config/pricing";

export default async function PricingPage() {
  const supabase = createPublicClient();
  const { data: dbServices } = await supabase
    .from("services")
    .select("slug,title,category,short_desc,starting_at,currency,duration_note,features")
    .eq("is_active", true)
    .order("sort_order");

  const services = (dbServices && dbServices.length > 0)
    ? dbServices
    : (demoServices.filter((s) => (s as any).is_active !== false) as any[]);

  const grouped = (services ?? []).reduce<Record<string, typeof services>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <>
      {/* hero */}
      <section className="shell py-24">
        <p className="drawer-label">Pricing</p>
        <h1 className="mt-8 max-w-3xl text-[var(--text-h1)]">
          Honest numbers. Fixed before we start.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-bone-200">
          Every price here is a starting point. Your exact quote depends on scope — and
          you get it in writing, as a fixed number, before any work begins.
        </p>

        {/* trust badges */}
        <div className="mt-8 flex flex-wrap gap-2.5">
          {[
            "✓ 100% Code Ownership",
            "✓ 50/50 Milestone Split",
            "✓ Zero Hidden Fees",
            "✓ 90+ Lighthouse Speed Guarantee",
          ].map((pill) => (
            <span
              key={pill}
              className="mono-tag rounded-lg bg-ink-800/80 border border-ink-600 px-3 py-1.5 text-bone-200 text-xs"
            >
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* signature tiers */}
      <section className="shell pb-12">
        <Reveal className="grid gap-5 lg:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`card relative flex flex-col p-8 ${
                t.popular ? "border-lime-400/50 lg:-mt-4 lg:pb-12" : ""
              }`}
            >
              {t.popular && (
                <span className="mono-tag absolute -top-3 left-8 rounded-full bg-lime-400 px-3 py-1 text-lime-950 font-semibold">
                  most chosen
                </span>
              )}
              <h2 className="text-2xl">{t.name}</h2>
              <p className="mt-2 text-sm text-bone-400">{t.tagline}</p>

              <div className="mt-6 border-y border-ink-600 py-5">
                <p className="text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  <span className="text-lg text-bone-400">from </span>
                  {money(tierFrom(t, services), "USD")}
                </p>
                <p className="mono-tag mt-2">typically {t.timeline}</p>
              </div>

              <FeatureList features={t.features} className="mt-6 flex-1" />

              <p className="mt-5 border-t border-ink-700 pt-4 text-xs leading-relaxed text-bone-400">
                <span className="text-bone-300">Not included:</span> {t.excludes}
              </p>

              {/* Carries the tier through to the contact form, which shows it
                  back as a banner. This used to be a bare `/contact`, so
                  picking a package here landed on a form that had forgotten
                  which one you picked. Same param names as the per-service
                  tiers in `ServicePricingTiers` — there is one reader. */}
              <Link
                href={`/contact?package=${encodeURIComponent(t.name)}&tier_name=${encodeURIComponent(
                  t.name
                )}&price=${encodeURIComponent(`from ${money(tierFrom(t, services), "USD")}`)}`}
                className={`mt-8 justify-center ${t.popular ? "btn btn-primary" : "btn"}`}
              >
                Start with {t.name}
              </Link>
            </div>
          ))}
        </Reveal>
      </section>

      {/* per-service starting prices */}
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="shell py-10">
          <p className="drawer-label">{category}</p>
          <Reveal className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items!.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="card group flex items-start justify-between gap-4 p-6 transition-all duration-200 hover:border-lime-400/40 hover:bg-ink-800/90"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-medium leading-snug text-bone-50 group-hover:text-lime-400 transition-colors">
                    {s.title}
                  </h3>
                  <p className="mono-tag mt-2.5">{s.duration_note}</p>
                </div>
                <div className="shrink-0 text-right pt-0.5">
                  <p className="text-sm font-semibold text-bone-50" style={{ fontFamily: "var(--font-mono)" }}>
                    {s.starting_at ? `from ${money(Number(s.starting_at), s.currency ?? "USD")}` : "on request"}
                  </p>
                  <span className="mono-tag inline-block mt-2 text-lime-400 transition-transform group-hover:translate-x-1">
                    details →
                  </span>
                </div>
              </Link>
            ))}
          </Reveal>
        </section>
      ))}

      <CTA />
    </>
  );
}
