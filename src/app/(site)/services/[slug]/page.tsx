import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CTA from "@/components/site/CTA";
import { money } from "@/lib/utils";
import { BrowserFrame, DashboardMockup, MobileMockup, CodeMockup, SeoMockup } from "@/components/site/mockups";
import { gradientFor } from "@/lib/images";

export const revalidate = 300;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("services")
    .select("title,short_desc,seo_title,seo_desc").eq("slug", slug).single();
  if (!data) return { title: "Service" };
  return { title: data.seo_title ?? data.title, description: data.seo_desc ?? data.short_desc ?? undefined };
}

/** Picks a code-drawn visual that suits each service — no stock photos. */
function ServiceVisual({ slug }: { slug: string }) {
  const map: Record<string, React.ReactNode> = {
    "web-development": <BrowserFrame url="app.yourbrand.com"><DashboardMockup /></BrowserFrame>,
    "web-design": <BrowserFrame url="yourbrand.com"><DashboardMockup /></BrowserFrame>,
    "custom-software": <BrowserFrame url="internal.tool"><DashboardMockup /></BrowserFrame>,
    "ecommerce": <BrowserFrame url="shop.yourbrand.com"><DashboardMockup /></BrowserFrame>,
    "mobile-apps": (
      <div className="grid place-items-center rounded-xl border border-ink-600 p-10" style={{ background: gradientFor("mobile") }}>
        <MobileMockup />
      </div>
    ),
    "seo": <div className="overflow-hidden rounded-xl border border-ink-600"><SeoMockup /></div>,
    "analytics-cro": <div className="overflow-hidden rounded-xl border border-ink-600"><SeoMockup /></div>,
    "ai-automation": <div className="overflow-hidden rounded-xl border border-ink-600"><CodeMockup /></div>,
    "hosting-devops": <div className="overflow-hidden rounded-xl border border-ink-600"><CodeMockup /></div>,
  };
  return (
    <>{map[slug] ?? <div className="grid aspect-[4/3] place-items-center rounded-xl border border-ink-600"
      style={{ background: gradientFor(slug) }}><MobileMockup /></div>}</>
  );
}

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: service } = await supabase.from("services").select("*").eq("slug", slug).single();
  if (!service) notFound();

  const [{ data: packages }, { data: others }] = await Promise.all([
    supabase.from("packages").select("*").eq("service_id", service.id).order("sort_order"),
    supabase.from("services").select("slug,title,short_desc")
      .eq("category", service.category).neq("slug", slug).limit(3),
  ]);

  const displayPackages =
    packages && packages.length >= 3
      ? packages.map((p: { id: string; name: string; price: number; currency?: string; is_popular?: boolean; features?: string[] }) => ({
          id: p.id,
          name: p.name,
          price_display: money(Number(p.price), p.currency ?? "USD"),
          is_popular: Boolean(p.is_popular),
          badge: p.is_popular ? "most chosen" : null,
          cta: "Get a quote",
          features: p.features ?? [],
        }))
      : [
          {
            id: "starter",
            name: "Starter",
            price_display: service.starting_at
              ? money(Number(service.starting_at), "USD")
              : "On request",
            is_popular: false,
            badge: "essential",
            cta: "Get started",
            features: [
              ...(service.features ?? []).slice(0, 3),
              "Standard delivery timeline",
              "1 round of revisions",
              "1 month included support",
            ],
          },
          {
            id: "professional",
            name: "Professional",
            price_display: service.starting_at
              ? money(Math.round(Number(service.starting_at) * 2.2), "USD")
              : "Custom",
            is_popular: true,
            badge: "most chosen",
            cta: "Choose Professional",
            features: [
              ...(service.features ?? []).slice(0, 5),
              "Priority delivery timeline",
              "2 rounds of revisions",
              "3 months included support",
              "Complete source files & assets",
            ],
          },
          {
            id: "enterprise",
            name: "Enterprise",
            price_display: "Custom",
            is_popular: false,
            badge: "custom scope",
            cta: "Contact us",
            features: [
              "Full custom scope & architecture",
              "Dedicated project lead & SLA",
              "Advanced integrations & security",
              "12 months support & retainer options",
            ],
          },
        ];

  return (
    <>
      {/* hero with visual */}
      <section className="shell py-24">
        <Link href="/services" className="mono-tag hover:text-bone-50">← all services</Link>
        <div className="mt-10 grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="drawer-label">{service.category}</p>
            <h1 className="mt-6 text-[var(--text-h1)]">{service.title}</h1>
            <p className="mt-6 text-lg text-bone-200">{service.short_desc}</p>

            <div className="mt-10 flex flex-wrap gap-x-12 gap-y-4 border-y border-ink-600 py-6">
              <div>
                <p className="mono-tag">Starting at</p>
                <p className="mt-1 text-xl">
                  {service.starting_at ? money(Number(service.starting_at), service.currency ?? "USD") : "On request"}
                </p>
              </div>
              <div>
                <p className="mono-tag">Timeline</p>
                <p className="mt-1 text-xl">{service.duration_note ?? "Varies"}</p>
              </div>
            </div>

            <Link href="/contact" className="btn btn-primary mt-8">Get a quote</Link>
          </div>

          <ServiceVisual slug={slug} />
        </div>
      </section>

      {/* 3 Package Tiers Section */}
      <section className="shell border-t border-ink-600 py-16">
        <p className="drawer-label">Packages & Pricing</p>
        <h2 className="mt-4 text-[var(--text-h2)]">Choose a package or get a custom scope</h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {displayPackages.map((p) => (
            <div
              key={p.id}
              className={`card relative flex flex-col justify-between p-7 ${
                p.is_popular ? "border-lime-400/60 shadow-lg" : ""
              }`}
            >
              {p.is_popular && (
                <span className="mono-tag absolute -top-3 left-7 rounded-full bg-lime-400 px-3 py-1 text-xs text-lime-950 font-semibold">
                  most chosen
                </span>
              )}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-medium">{p.name}</h3>
                  {p.badge && !p.is_popular && (
                    <span className="mono-tag rounded-full bg-ink-700 px-3 py-1 text-xs text-bone-300">
                      {p.badge}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  {p.price_display}
                </p>

                <ul className="mt-6 space-y-2.5 border-t border-ink-600 pt-5">
                  {p.features.map((f: string) => (
                    <li key={f} className="flex gap-2.5 text-sm text-bone-300">
                      <span className="text-lime-400">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/contact"
                className={`btn mt-8 w-full justify-center ${p.is_popular ? "btn-primary" : ""}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* included details + related services */}
      <section className="shell grid gap-16 pb-24 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-[var(--text-h3)]">What&apos;s included in detail</h2>
          <ul className="mt-8 divide-y divide-ink-600 border-y border-ink-600">
            {(service.features ?? []).map((f: string) => (
              <li key={f} className="flex gap-4 py-4">
                <span className="text-lime-400">/</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {service.long_desc && (
            <div className="mt-10 whitespace-pre-line leading-relaxed text-bone-200">{service.long_desc}</div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="card p-7">
            <h3 className="text-xl">Every project is quoted in writing</h3>
            <p className="mt-3 text-sm text-bone-400">
              Tell us your requirements and you get a fixed written price proposal within 24 hours. No hidden fees or unexpected extras.
            </p>
            <Link href="/contact" className="btn btn-primary mt-6 w-full justify-center">Get a custom quote</Link>
          </div>

          {!!others?.length && (
            <div className="card p-7">
              <p className="mono-tag">Often paired with</p>
              <ul className="mt-4 space-y-3">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/services/${o.slug}`} className="text-sm text-bone-200 hover:text-lime-400 transition-colors">
                      {o.title} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>

      <CTA />
    </>
  );
}
