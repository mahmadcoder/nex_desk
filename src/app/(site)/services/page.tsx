import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Reveal from "@/components/site/Reveal";
import CTA from "@/components/site/CTA";
import { demoServices } from "@/lib/demo";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Services",
  description: "Web development, design, SEO, paid ads, mobile apps, AI automation and more.",
};
export const revalidate = 300;

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: dbServices } = await supabase
    .from("services").select("*").eq("is_active", true).order("sort_order");

  const services = (dbServices && dbServices.length > 0) ? dbServices : (demoServices as any[]);

  const grouped = (services ?? []).reduce<Record<string, typeof services>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <>
      <section className="shell py-16">
        <p className="drawer-label">Services</p>
        <h1 className="mt-6 max-w-4xl text-[var(--text-h1)]">
          Everything needed to launch and grow a product.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-bone-200">
          Grouped by what they do for you rather than by our internal departments.
        </p>
      </section>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="shell border-t border-ink-600 py-12">
          <p className="drawer-label">{category}</p>
          <Reveal className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items!.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`}
                className="card group flex flex-col justify-between p-7 hover:border-lime-400/40">
                <div>
                  <h2 className="text-2xl">{s.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-bone-400">{s.short_desc}</p>
                  <ul className="mt-6 space-y-2">
                    {(s.features ?? []).slice(0, 4).map((f: string) => (
                      <li key={f} className="text-xs text-bone-200 flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 flex items-center justify-center shrink-0">
                          <Check size={11} />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-ink-600 pt-5">
                  <span className="mono-tag">
                    {s.starting_at ? `from $${Number(s.starting_at).toLocaleString()}` : "on request"}
                  </span>
                  <span className="text-lime-400 transition-transform group-hover:translate-x-1">→</span>
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
