import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import CTA from "@/components/site/CTA";
import JsonLd from "@/components/JsonLd";
import { serviceLd, faqLd, breadcrumbLd } from "@/lib/jsonLd";
import { demoServices } from "@/lib/agencyData";
import ServicePricingTiers from "@/components/site/ServicePricingTiers";
import ServiceProcessRoadmap from "@/components/site/ServiceProcessRoadmap";
import ServiceFaqAccordion from "@/components/site/ServiceFaqAccordion";
import FeatureList from "@/components/site/FeatureList";
import { ShieldCheck, Clock, Award, ArrowRight, ArrowLeft, Layers, Sparkles } from "lucide-react";

export const revalidate = 300;

/**
 * Pre-renders every services page at build time.
 *
 * Without this the route is rendered on demand, so the first click on a link
 * waited on a server round trip with nothing on screen — the page you were
 * already on just sat there for about a second.
 *
 * Returning an empty array on failure is deliberate: a build that cannot reach
 * the database should still succeed and fall back to on-demand rendering,
 * rather than failing outright.
 */
export async function generateStaticParams() {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase.from("services").select("slug").eq("is_active", true);
    if (data?.length) return data.map((r) => ({ slug: r.slug as string }));
    return demoServices.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase.from("services")
    .select("title,short_desc,seo_title,seo_desc").eq("slug", slug).single();
  if (!data) {
    const demo = demoServices.find((s) => s.slug === slug);
    if (demo) return { title: `${demo.title} — Nex Desk Agency`, description: demo.short_desc };
    return { title: "Service — Nex Desk Agency" };
  }
  return {
    title: `${data.seo_title ?? data.title} — Nex Desk Agency`,
    description: data.seo_desc ?? data.short_desc ?? undefined,
  };
}

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: dbService } = await supabase.from("services").select("*").eq("slug", slug).single();
  const service = dbService || (demoServices.find((s) => s.slug === slug) as any);
  if (!service || service.is_active === false) notFound();

  const { data: others } = await supabase
    .from("services")
    .select("slug,title,short_desc,category")
    .eq("is_active", true)
    .neq("slug", slug)
    .limit(3);

  const fallbackOthers = others?.length
    ? others
    : demoServices.filter((s) => s.slug !== slug && s.is_active !== false).slice(0, 3);

  return (
    <>
      <JsonLd data={serviceLd(service)} />
      <JsonLd data={faqLd(service.faqs ?? [])} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.title, path: `/services/${service.slug}` },
        ])}
      />

      {/* ── Glassmorphism Hero Banner ── */}
      <section className="relative overflow-hidden bg-ink-900 py-12 lg:py-16">
        {/* Glow backdrop gradient */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-96 w-full max-w-7xl bg-radial-glow opacity-30 blur-3xl" />

        <div className="shell relative z-10">
          <Link
            href="/services"
            className="mono-tag text-xs text-bone-400 hover:text-lime-400 transition-colors inline-flex items-center gap-1.5 mb-6"
          >
            <ArrowLeft size={13} /> back to all services
          </Link>

          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="mono-tag text-xs bg-lime-400/10 text-lime-400 px-3 py-1 rounded-full border border-lime-400/20 font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
                {service.category}
              </span>
              <span className="mono-tag text-xs text-bone-400 border border-ink-600 px-2.5 py-1 rounded-full">
                Guaranteed Delivery
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-bone-50 leading-[1.15]">
              {service.title}
            </h1>

            <p className="mt-5 text-base sm:text-lg text-bone-200 leading-relaxed max-w-3xl">
              {service.short_desc}
            </p>

            {/* Quick Hero Key Stats */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3 py-5">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="mono-tag text-[10px]">Starting Investment</p>
                  <p className="text-base sm:text-lg font-bold text-bone-50 mt-0.5">
                    {service.starting_at ? `$${Number(service.starting_at).toLocaleString()}` : "Custom Quote"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-sky-400/10 border border-sky-400/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="mono-tag text-[10px]">Estimated Timeline</p>
                  <p className="text-base sm:text-lg font-bold text-bone-50 mt-0.5">
                    {service.duration_note || "2–4 weeks delivery"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="mono-tag text-[10px]">Code & IP Ownership</p>
                  <p className="text-base sm:text-lg font-bold text-bone-50 mt-0.5">100% Full Ownership</p>
                </div>
              </div>
            </div>

            {/* Hero CTA Action */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <a href="#pricing-tiers" className="btn btn-primary h-11 px-6 text-sm font-semibold cursor-pointer">
                Explore Pricing Tiers ↓
              </a>
              <Link
                href={`/contact?service=${encodeURIComponent(service.slug)}`}
                className="btn h-11 px-6 text-sm text-bone-200 border-ink-600 bg-ink-800 hover:text-bone-50 cursor-pointer"
              >
                Book a Free Discovery Call
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Deliverables & What's Included ── */}
      <section className="shell py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-start">
          <div className="space-y-4">
            <span className="mono-tag text-lime-400 bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/20 inline-flex items-center gap-1.5">
              <Layers size={13} /> Complete Package Scope
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-bone-50 pt-1">
              What&apos;s Included in {service.title}
            </h2>
            <p className="text-sm sm:text-base text-bone-300 leading-relaxed pt-2 pb-2">
              {service.long_desc ||
                `Every ${service.title} project is built on modern open standards to ensure zero tech debt, sub-second load performance, and seamless future scalability.`}
            </p>

            {/* Feature Checklist */}
            <FeatureList
              variant="cards"
              size="xs"
              className="pt-3"
              features={
                service.features ?? [
                  "Next.js & React Modern Architecture",
                  "Sub-second Load Times (<1s)",
                  "TailwindCSS Design Tokens & Theme",
                  "Supabase Database & Authentication",
                  "100% Code & Asset Copyright",
                  "Complimentary Warranty & Maintenance",
                ]
              }
            />
          </div>

          {/* Side Highlight Card */}
          <div className="card p-8 border-lime-400/40 bg-ink-900/90 relative overflow-hidden space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/30 flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <p className="mono-tag text-[10px] text-lime-400">The Nex Desk Advantage</p>
                <h3 className="text-lg font-semibold text-bone-50">Fixed Price Guarantee</h3>
              </div>
            </div>

            <p className="text-xs text-bone-300 leading-relaxed">
              We operate on fixed-fee written quotes. No surprise hourly billing, no scope inflation. You get a dedicated team and clear weekly milestones.
            </p>

            <FeatureList
              size="xs"
              className="pt-2"
              features={[
                "Direct senior engineer & designer communication",
                "Weekly staging demo links & progress reports",
                "Post-launch maintenance & bug warranty",
              ]}
            />

            <Link
              href={`/contact?service=${encodeURIComponent(service.slug)}`}
              className="btn btn-primary w-full justify-center h-10 text-sm font-semibold mt-4 cursor-pointer"
            >
              Start Your Project Now →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3-Tier Pricing Comparison Matrix ── */}
      <section className="shell py-16">
        <ServicePricingTiers
          serviceSlug={service.slug}
          serviceTitle={service.title}
          tiers={service.pricing_tiers}
          startingAt={service.starting_at}
          currency={service.currency}
        />
      </section>

      {/* ── 4-Phase Delivery Process ── */}
      <section className="shell py-16">
        <ServiceProcessRoadmap steps={service.process_steps} />
      </section>

      {/* ── Service FAQ Accordion ── */}
      <section className="shell py-16">
        <ServiceFaqAccordion faqs={service.faqs} serviceTitle={service.title} />
      </section>

      {/* ── Related Services Catalog ── */}
      {!!fallbackOthers?.length && (
        <section className="shell py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="mono-tag text-xs text-lime-400">Related Capabilities</span>
              <h2 className="text-xl sm:text-2xl font-semibold text-bone-50 mt-1">Frequently paired services</h2>
            </div>
            <Link href="/services" className="mono-tag text-xs text-bone-400 hover:text-lime-400 transition-colors flex items-center gap-1 cursor-pointer">
              View all 16 services →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {fallbackOthers.map((o) => (
              <Link
                key={o.slug}
                href={`/services/${o.slug}`}
                className="card p-6 sm:p-7 border-ink-600 bg-ink-900/60 hover:border-lime-400/50 hover:bg-ink-900 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <span className="mono-tag text-[10px] text-lime-400 block mb-2">{o.category}</span>
                  <h3 className="text-base font-semibold text-bone-50 group-hover:text-lime-400 transition-colors flex items-center justify-between leading-snug">
                    {o.title}
                    <ArrowRight size={15} className="opacity-0 group-hover:opacity-100 transition-opacity text-lime-400 shrink-0 ml-1" />
                  </h3>
                  <p className="text-xs text-bone-300 leading-relaxed mt-3">{o.short_desc}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-ink-800 text-[11px] font-mono text-lime-400/80 group-hover:text-lime-400 transition-colors flex items-center gap-1">
                  Explore service →
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Conversion CTA */}
      <CTA />
    </>
  );
}
