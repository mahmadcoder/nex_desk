import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Reveal from "@/components/site/Reveal";
import CTA from "@/components/site/CTA";
import FeatureList from "@/components/site/FeatureList";
import { money } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };
export const revalidate = 300;

/**
 * Three signature engagement tiers. These are presentational and easy to edit
 * right here — no database needed. Ranges read as honest; a single number
 * reads as bait.
 */
const TIERS = [
  {
    name: "Launch",
    tagline: "For a sharp marketing site that converts.",
    price: "$1,500 – $3,000",
    timeline: "2–3 weeks",
    features: [
      "Up to 6 custom-designed pages",
      "Mobile-first, fast (90+ Lighthouse)",
      "CMS so you can edit content yourself",
      "Contact forms & lead capture",
      "Basic SEO setup",
      "2 weeks free support",
    ],
    popular: false,
  },
  {
    name: "Growth",
    tagline: "For a web app, store, or serious build.",
    price: "$4,000 – $8,000",
    timeline: "6–8 weeks",
    features: [
      "Everything in Launch",
      "Custom web app or e-commerce",
      "User accounts & dashboards",
      "Third-party & payment integrations",
      "Admin panel to run it yourself",
      "2 revision rounds per milestone",
      "2 weeks free support",
    ],
    popular: true,
  },
  {
    name: "Scale",
    tagline: "For custom software and SaaS platforms.",
    price: "$12,000+",
    timeline: "12+ weeks",
    features: [
      "Everything in Growth",
      "Full custom SaaS / platform",
      "Multi-role access & permissions",
      "Advanced analytics & reporting",
      "Dedicated project lead",
      "CI/CD, monitoring & DevOps",
      "12 months support & retainer options",
    ],
    popular: false,
  },
];

import { demoServices } from "@/lib/agencyData";

export default async function PricingPage() {
  const supabase = await createClient();
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
                  {t.price}
                </p>
                <p className="mono-tag mt-2">typically {t.timeline}</p>
              </div>

              <FeatureList features={t.features} className="mt-6 flex-1" />

              <Link
                href="/contact"
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
