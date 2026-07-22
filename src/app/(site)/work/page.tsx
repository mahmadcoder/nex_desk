import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Reveal from "@/components/site/Reveal";
import CTA from "@/components/site/CTA";
import TexturePanel from "@/components/site/mockups/TexturePanel";
import { BrowserFrame, DashboardMockup, MobileMockup } from "@/components/site/mockups";
import { textureFor } from "@/lib/images";
import { demoCases } from "@/lib/demo";

export const metadata: Metadata = { title: "Work" };
export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function WorkPage() {
  const supabase = await createClient();
  const { data: dbCases } = await supabase
    .from("case_studies")
    .select("slug,title,client_name,industry,cover_url,outcome,metrics,tech_stack")
    .eq("is_published", true)
    .order("sort_order");

  // Use real case studies if you have them; otherwise show the samples.
  const cases: any[] = dbCases?.length ? dbCases : demoCases;
  const industries = Array.from(new Set(cases.map((c) => c.industry).filter(Boolean)));

  return (
    <>
      {/* hero */}
      <section className="shell py-24">
        <p className="drawer-label">Work</p>
        <h1 className="mt-8 max-w-3xl text-[var(--text-h1)]">
          Shipped, live, and still running.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-bone-200">
          A few of the things that have left the desk. Real builds, real numbers.
        </p>

        {/* filter chips (visual grouping — links scroll to sections) */}
        {industries.length > 1 && (
          <div className="mt-10 flex flex-wrap gap-2">
            <span className="rounded-full border border-lime-400 bg-lime-400 px-4 py-2 text-sm text-lime-950">All</span>
            {industries.map((ind) => (
              <span key={ind} className="rounded-full border border-ink-600 px-4 py-2 text-sm text-bone-300">
                {ind}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* cards */}
      <section className="shell pb-24">
        <Reveal className="grid gap-6 lg:grid-cols-2">
          {cases.map((c, i) => (
            <Link
              key={c.slug}
              href={`/work/${c.slug}`}
              className="card group flex flex-col overflow-hidden transition-colors hover:border-lime-400/40"
            >
              {/* cover */}
              <TexturePanel src={textureFor(c.slug)} className="p-6" overlay={0.78}>
                <BrowserFrame url={`${c.slug}.com`}>
                  {c.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt="" className="aspect-[16/10] w-full object-cover" />
                  ) : i % 2 === 0 ? (
                    <DashboardMockup />
                  ) : (
                    <div className="grid aspect-[16/10] place-items-center bg-ink-800">
                      <MobileMockup />
                    </div>
                  )}
                </BrowserFrame>
              </TexturePanel>

              {/* body */}
              <div className="flex flex-1 flex-col p-7">
                <div className="flex items-center gap-3">
                  <span className="mono-tag">{c.industry}</span>
                  <span className="mono-tag">·</span>
                  <span className="mono-tag">{c.client_name}</span>
                </div>
                <h2 className="mt-3 text-2xl">{c.title}</h2>
                <p className="mt-3 text-sm text-bone-400">{c.outcome}</p>

                {!!(c.metrics as any[])?.length && (
                  <div className="mt-6 flex gap-8 border-t border-ink-600 pt-5">
                    {(c.metrics as any[]).slice(0, 3).map((m) => (
                      <div key={m.label}>
                        <p className="text-xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{m.value}</p>
                        <p className="mono-tag mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <span className="mt-6 inline-flex items-center gap-2 text-sm text-lime-400">
                  View case study
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </div>
            </Link>
          ))}
        </Reveal>
      </section>

      <CTA />
    </>
  );
}
