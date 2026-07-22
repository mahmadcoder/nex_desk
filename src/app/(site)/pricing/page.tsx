import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Reveal from "@/components/site/Reveal";
import CTA from "@/components/site/CTA";
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
      "1 month free support",
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
      "3 months free support",
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

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("slug,title,category,short_desc,starting_at,currency,duration_note,features")
    .eq("is_active", true)
    .order("sort_order");

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
      </section>

      {/* signature tiers */}
      <section className="shell pb-8">
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

              <ul className="mt-6 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm text-bone-200">
                    <span className="mt-0.5 text-lime-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className={`mt-8 justify-center ${t.popular ? "btn btn-primary" : "btn"}`}
              >
                Start with {t.name}
              </Link>
            </div>
          ))}
        </Reveal>

        <p className="mono-tag mt-6 text-center">
          all tiers tailored to your exact requirements · priced in USD (invoices payable in USD, EUR, GBP or AED)
        </p>
      </section>

      {/* per-service starting prices, as cards not a table */}
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="shell border-t border-ink-600 py-14">
          <p className="drawer-label">{category}</p>
          <Reveal className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items!.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="card group flex items-center justify-between gap-4 p-5 hover:border-lime-400/40"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-lg">{s.title}</h3>
                  <p className="mono-tag mt-1">{s.duration_note}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                    {s.starting_at ? `from ${money(Number(s.starting_at), s.currency ?? "USD")}` : "on request"}
                  </p>
                  <span className="mono-tag text-lime-400 transition-transform group-hover:translate-x-0.5">
                    details →
                  </span>
                </div>
              </Link>
            ))}
          </Reveal>
        </section>
      ))}

      {/* reassurance band */}
      <section className="shell py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["50 / 50", "Standard split", "Half to start, half on delivery. Bigger builds split across milestones."],
            ["No surprises", "Change orders", "Anything outside scope is quoted and approved before we touch it."],
            ["You own it", "Full handover", "Source code, design files and accounts transfer to you on final payment."],
          ].map(([big, label, body]) => (
            <div key={label} className="card p-7">
              <p className="text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{big}</p>
              <p className="mono-tag mt-2">{label}</p>
              <p className="mt-3 text-sm text-bone-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <CTA />
    </>
  );
}
