import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CTA from "@/components/site/CTA";
import TexturePanel from "@/components/site/mockups/TexturePanel";
import { BrowserFrame, DashboardMockup } from "@/components/site/mockups";
import { textureFor } from "@/lib/images";
import { demoCases } from "@/lib/demo";
import { Calendar, Building2, Tag, Globe, ArrowUpRight } from "lucide-react";

export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getCase(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("case_studies").select("*").eq("slug", slug).eq("is_published", true).single();
  if (data) return { data, isDemo: false };
  const demo = demoCases.find((c) => c.slug === slug);
  return demo ? { data: demo as any, isDemo: true } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const found = await getCase(slug);
  return { title: found ? `${found.data.title} · Work` : "Case study" };
}

export default async function CaseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getCase(slug);
  if (!found) notFound();
  const c = found.data;

  // next project for the footer link
  const supabase = await createClient();
  const { data: others } = await supabase
    .from("case_studies").select("slug,title,client_name").eq("is_published", true).neq("slug", slug).limit(1);
  const next = others?.[0] ?? demoCases.find((d) => d.slug !== slug);

  const meta = [
    [Building2, "Client", c.client_name],
    [Tag, "Industry", c.industry],
    [Calendar, "Year", c.year ?? "—"],
  ].filter(([, , v]) => v) as [any, string, string][];

  return (
    <>
      {/* hero */}
      <section className="shell pt-24">
        <Link href="/work" className="mono-tag hover:text-bone-50">← all work</Link>
        <h1 className="mt-8 max-w-4xl text-[var(--text-h1)]">{c.title}</h1>
        <p className="mt-6 max-w-2xl text-lg text-bone-200">{c.outcome}</p>

        {/* meta row */}
        <div className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-y border-ink-600 py-6">
          {meta.map(([Icon, label, value]) => (
            <div key={label} className="flex items-center gap-3">
              <Icon size={18} strokeWidth={1.5} className="text-lime-400" />
              <div>
                <p className="mono-tag">{label}</p>
                <p className="mt-0.5 text-sm">{value}</p>
              </div>
            </div>
          ))}
          {c.live_url && (
            <a href={c.live_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-lime-400">
              <Globe size={18} strokeWidth={1.5} className="text-lime-400" />
              <div>
                <p className="mono-tag">Live site</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-sm">Visit <ArrowUpRight size={13} /></p>
              </div>
            </a>
          )}
        </div>
      </section>

      {/* hero visual */}
      <section className="shell mt-12">
        <TexturePanel src={textureFor(c.slug)} className="rounded-2xl border border-ink-600 p-8 sm:p-14" overlay={0.78}>
          <BrowserFrame url={c.live_url ? new URL(c.live_url).hostname : `${c.slug}.com`}>
            {c.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.cover_url} alt="" className="w-full object-cover" />
            ) : (
              <DashboardMockup />
            )}
          </BrowserFrame>
        </TexturePanel>
      </section>

      {/* metrics band */}
      {!!(c.metrics as any[])?.length && (
        <section className="shell py-20">
          <div className="grid gap-px overflow-hidden rounded-xl border border-ink-600 bg-ink-600 sm:grid-cols-3">
            {(c.metrics as any[]).map((m) => (
              <div key={m.label} className="bg-ink-950 p-8 text-center">
                <p className="text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-tighter"
                  style={{ fontFamily: "var(--font-display)" }}>
                  {m.value}
                </p>
                <p className="mono-tag mt-3 justify-center">{m.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* narrative */}
      <section className="shell grid gap-14 pb-20 lg:grid-cols-2">
        {c.challenge && (
          <div>
            <p className="drawer-label">The challenge</p>
            <p className="mt-5 whitespace-pre-line leading-relaxed text-bone-200">{c.challenge}</p>
          </div>
        )}
        {c.solution && (
          <div>
            <p className="drawer-label">What we did</p>
            <p className="mt-5 whitespace-pre-line leading-relaxed text-bone-200">{c.solution}</p>
          </div>
        )}
      </section>

      {/* services + tech */}
      <section className="shell grid gap-14 border-t border-ink-600 py-16 lg:grid-cols-2">
        {!!(c.services as string[])?.length && (
          <div>
            <p className="drawer-label">Services</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(c.services as string[]).map((s) => (
                <span key={s} className="rounded-full border border-ink-600 px-4 py-2 text-sm text-bone-200">{s}</span>
              ))}
            </div>
          </div>
        )}
        {!!(c.tech_stack as string[])?.length && (
          <div>
            <p className="drawer-label">Built with</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(c.tech_stack as string[]).map((t) => (
                <span key={t} className="inline-flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-3.5 py-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* next project */}
      {next && (
        <section className="shell py-16">
          <Link href={`/work/${next.slug}`} className="card group flex items-center justify-between gap-6 p-8 hover:border-lime-400/40">
            <div>
              <p className="mono-tag">Next case study</p>
              <p className="mt-2 text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{next.title}</p>
              <p className="mt-1 text-sm text-bone-400">{next.client_name}</p>
            </div>
            <span className="text-2xl text-lime-400 transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </section>
      )}

      <CTA />
    </>
  );
}
