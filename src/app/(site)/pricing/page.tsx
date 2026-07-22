import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CTA from "@/components/site/CTA";

export const metadata: Metadata = { title: "Pricing" };
export const revalidate = 300;

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: services } = await supabase.from("services")
    .select("*")
    .eq("is_active", true).order("sort_order");

  return (
    <>
      <section className="shell py-16">
        <p className="drawer-label">Pricing</p>
        <h1 className="mt-6 max-w-3xl text-[var(--text-h1)]">
          Honest starting points, not bait.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-bone-200">
          Every price below is a starting point — your final quote depends on scope,
          features and complexity. We send a fixed written price before any work begins.
          No surprises, ever.
        </p>
      </section>

      {/* Disclaimer banner */}
      <section className="shell pb-8">
        <div className="rounded-xl border border-lime-400/20 bg-lime-400/5 px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 text-xl text-lime-400">◈</span>
            <div>
              <p className="text-sm font-medium text-bone-50">
                These prices reflect the simplest version of each service.
              </p>
              <p className="mt-1 text-sm text-bone-400">
                More pages, more screens, custom features, tighter deadlines — all move
                the price up. That&apos;s normal. You get an exact, fixed quote once we understand your scope.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="shell pb-12">
        <div className="overflow-hidden rounded-xl border border-ink-600">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800">
              <tr className="mono-tag">
                <th className="px-6 py-4 font-normal">Service</th>
                <th className="hidden px-6 py-4 font-normal sm:table-cell">Category</th>
                <th className="hidden px-6 py-4 font-normal md:table-cell">Timeline</th>
                <th className="px-6 py-4 font-normal">Starting at</th>
                <th className="hidden px-6 py-4 font-normal lg:table-cell">Includes at this price</th>
                <th className="px-6 py-4 font-normal"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600">
              {(services ?? []).map((s) => (
                <tr key={s.slug} className="hover:bg-ink-800/50">
                  <td className="px-6 py-4">
                    <Link href={`/services/${s.slug}`} className="hover:text-lime-400">{s.title}</Link>
                  </td>
                  <td className="hidden px-6 py-4 text-bone-400 sm:table-cell">{s.category}</td>
                  <td className="hidden px-6 py-4 text-bone-400 md:table-cell">{s.duration_note}</td>
                  <td className="px-6 py-4 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)" }}>
                    {s.starting_at
                      ? <>
                          <span className="text-bone-50">from ${Number(s.starting_at).toLocaleString()}</span>
                        </>
                      : <span className="text-bone-400">On request</span>}
                  </td>
                  <td className="hidden px-6 py-4 text-bone-400 text-xs lg:table-cell">
                    {s.scope_note ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href="/contact"
                      className="whitespace-nowrap text-xs text-lime-400 hover:text-lime-500 transition-colors"
                    >
                      Get a quote →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mono-tag mt-5">
          Prices in USD. We also invoice in PKR, GBP, EUR and AED. Final price is fixed once scope is agreed.
        </p>
      </section>

      <section className="shell pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["50 / 50", "Standard split", "Half to start, half on delivery. Larger projects split across milestones instead."],
            ["2 rounds", "Revisions included", "Per deliverable. Extra rounds are billed hourly at a rate you know upfront."],
            ["30 days", "Free support", "Bug fixes after launch at no cost. Retainers available after that."],
          ].map(([big, label, body]) => (
            <div key={label} className="card p-8">
              <p className="text-4xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{big}</p>
              <p className="mono-tag mt-3">{label}</p>
              <p className="mt-4 text-sm text-bone-400">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}
