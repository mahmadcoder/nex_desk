import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CTA from "@/components/site/CTA";

export const metadata: Metadata = { title: "Pricing" };
export const revalidate = 300;

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: services } = await supabase.from("services")
    .select("slug,title,category,starting_at,duration_note")
    .eq("is_active", true).order("sort_order");

  return (
    <>
      <section className="shell py-24">
        <p className="drawer-label">Pricing</p>
        <h1 className="mt-8 max-w-3xl text-[var(--text-h1)]">
          Fixed prices, written down before we start.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-bone-200">
          These are honest starting points, not bait. Your quote is fixed once the
          scope is agreed, and anything added later comes as a change order you approve first.
        </p>
      </section>

      <section className="shell pb-16">
        <div className="overflow-hidden rounded-xl border border-ink-600">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800">
              <tr className="mono-tag">
                <th className="px-6 py-4 font-normal">Service</th>
                <th className="px-6 py-4 font-normal">Category</th>
                <th className="px-6 py-4 font-normal">Typical timeline</th>
                <th className="px-6 py-4 text-right font-normal">Starting at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600">
              {(services ?? []).map((s) => (
                <tr key={s.slug} className="hover:bg-ink-800/50">
                  <td className="px-6 py-4">
                    <Link href={`/services/${s.slug}`} className="hover:text-lime-400">{s.title}</Link>
                  </td>
                  <td className="px-6 py-4 text-bone-400">{s.category}</td>
                  <td className="px-6 py-4 text-bone-400">{s.duration_note}</td>
                  <td className="px-6 py-4 text-right" style={{ fontFamily: "var(--font-mono)" }}>
                    {s.starting_at ? `Rs ${Number(s.starting_at).toLocaleString()}` : "On request"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mono-tag mt-5">
          Prices in PKR, excluding tax. We also invoice in USD, GBP, EUR and AED.
        </p>
      </section>

      <section className="shell pb-24">
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
