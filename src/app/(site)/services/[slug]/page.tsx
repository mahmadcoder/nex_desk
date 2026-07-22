import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CTA from "@/components/site/CTA";

export const revalidate = 300;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("services")
    .select("title,short_desc,seo_title,seo_desc").eq("slug", slug).single();
  if (!data) return { title: "Service" };
  return {
    title: data.seo_title ?? data.title,
    description: data.seo_desc ?? data.short_desc ?? undefined,
  };
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

  return (
    <>
      <section className="shell py-16">
        <Link href="/services" className="mono-tag hover:text-bone-50">← all services</Link>
        <p className="drawer-label mt-7">{service.category}</p>
        <h1 className="mt-6 max-w-4xl text-[var(--text-h1)]">{service.title}</h1>
        <p className="mt-6 max-w-2xl text-lg text-bone-200">{service.short_desc}</p>

        <div className="mt-8 flex flex-wrap gap-x-12 gap-y-4 border-y border-ink-600 py-6">
          <div>
            <p className="mono-tag">Starting at</p>
            <p className="mt-1 text-xl">
              {service.starting_at ? `$${Number(service.starting_at).toLocaleString()}` : "On request"}
            </p>
            {service.scope_note && (
              <p className="mt-1 text-xs text-bone-400">{service.scope_note} · Exact price depends on scope</p>
            )}
          </div>
          <div>
            <p className="mono-tag">Typical timeline</p>
            <p className="mt-1 text-xl">{service.duration_note ?? "Varies"}</p>
          </div>
        </div>
      </section>

      <section className="shell grid gap-16 pb-16 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-[var(--text-h3)]">What&apos;s included</h2>
          <ul className="mt-8 divide-y divide-ink-600 border-y border-ink-600">
            {(service.features ?? []).map((f: string) => (
              <li key={f} className="flex gap-4 py-4">
                <span className="text-lime-400">/</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {service.long_desc && (
            <div className="mt-10 whitespace-pre-line leading-relaxed text-bone-200">
              {service.long_desc}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {(packages ?? []).map((p) => (
            <div key={p.id} className={`card p-7 ${p.is_popular ? "border-lime-400/50" : ""}`}>
              {p.is_popular && (
                <span className="mono-tag rounded-full bg-lime-400 px-3 py-1 text-lime-950">
                  most picked
                </span>
              )}
              <h3 className="mt-4 text-xl">{p.name}</h3>
              <p className="mt-2 text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                ${Number(p.price).toLocaleString()}
              </p>
              <ul className="mt-5 space-y-2">
                {(p.features ?? []).map((f: string) => (
                  <li key={f} className="text-sm text-bone-400">{f}</li>
                ))}
              </ul>
              <Link href="/contact" className="btn btn-primary mt-6 w-full justify-center">
                Get a quote
              </Link>
            </div>
          ))}

          {!packages?.length && (
            <div className="card p-7">
              <h3 className="text-xl">Every project is quoted</h3>
              <p className="mt-3 text-sm text-bone-400">
                Tell us the scope and you get a fixed written price within a day. No hourly surprises.
              </p>
              <Link href="/contact" className="btn btn-primary mt-6 w-full justify-center">
                Get a quote
              </Link>
            </div>
          )}

          {!!others?.length && (
            <div className="card p-7">
              <p className="mono-tag">Often paired with</p>
              <ul className="mt-4 space-y-3">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/services/${o.slug}`} className="text-sm hover:text-lime-400">
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
