import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Reveal from "@/components/site/Reveal";
import CTA from "@/components/site/CTA";

export const metadata: Metadata = { title: "Work" };
export const revalidate = 300;

export default async function WorkPage() {
  const supabase = await createClient();
  const { data: cases } = await supabase.from("case_studies")
    .select("*").eq("is_published", true).order("sort_order");

  return (
    <>
      <section className="shell py-24">
        <p className="drawer-label">Work</p>
        <h1 className="mt-8 max-w-3xl text-[var(--text-h1)]">Shipped, live, and still running.</h1>
      </section>

      <section className="shell pb-24">
        {!cases?.length ? (
          <div className="card p-16 text-center">
            <h2 className="text-2xl">Case studies coming soon</h2>
            <p className="mx-auto mt-3 max-w-sm text-bone-400">
              Add them from the admin panel and they appear here automatically.
            </p>
          </div>
        ) : (
          <Reveal className="grid gap-5 md:grid-cols-2">
            {cases.map((c) => (
              <Link key={c.slug} href={`/work/${c.slug}`} className="card group overflow-hidden">
                <div className="aspect-[16/10] overflow-hidden bg-ink-700">
                  {c.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  )}
                </div>
                <div className="p-7">
                  <div className="flex items-center justify-between">
                    <span className="mono-tag">{c.industry}</span>
                    <span className="mono-tag">{c.client_name}</span>
                  </div>
                  <h2 className="mt-4 text-2xl">{c.title}</h2>
                  <p className="mt-3 text-sm text-bone-400">{c.outcome}</p>
                  {!!(c.metrics as { label: string; value: string }[])?.length && (
                    <div className="mt-6 flex gap-8 border-t border-ink-600 pt-5">
                      {(c.metrics as { label: string; value: string }[]).slice(0, 3).map((m) => (
                        <div key={m.label}>
                          <p className="text-xl" style={{ fontFamily: "var(--font-display)" }}>{m.value}</p>
                          <p className="mono-tag mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </Reveal>
        )}
      </section>
      <CTA />
    </>
  );
}
