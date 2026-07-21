import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Hero from "@/components/site/Hero";
import ServicesScroll from "@/components/site/ServicesScroll";
import Process from "@/components/site/Process";
import Marquee from "@/components/site/Marquee";
import Reveal from "@/components/site/Reveal";
import CTA from "@/components/site/CTA";

export const revalidate = 300;

export default async function Home() {
  const supabase = await createClient();

  const [{ data: services }, { data: cases }, { data: quotes }] = await Promise.all([
    supabase.from("services").select("slug,title,category,short_desc,starting_at")
      .eq("is_active", true).order("sort_order"),
    supabase.from("case_studies").select("slug,title,client_name,industry,cover_url,outcome,metrics")
      .eq("is_published", true).order("sort_order").limit(4),
    supabase.from("testimonials").select("client_name,role,company,quote,rating")
      .eq("is_published", true).order("sort_order").limit(3),
  ]);

  return (
    <>
      <Hero />
      <Marquee />
      <ServicesScroll services={services ?? []} />

      {!!cases?.length && (
        <section className="shell py-28">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="drawer-label">Selected work</p>
              <h2 className="mt-6 max-w-2xl text-[var(--text-h2)]">Things we shipped.</h2>
            </div>
            <Link href="/work" className="btn hidden shrink-0 sm:inline-flex">All work</Link>
          </div>

          <Reveal className="mt-14 grid gap-5 md:grid-cols-2">
            {cases.map((c) => (
              <Link key={c.slug} href={`/work/${c.slug}`} className="card group overflow-hidden">
                <div className="aspect-[16/10] overflow-hidden bg-ink-700">
                  {c.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  )}
                </div>
                <div className="p-7">
                  <span className="mono-tag">{c.industry}</span>
                  <h3 className="mt-3 text-2xl">{c.title}</h3>
                  <p className="mt-3 text-sm text-bone-400">{c.outcome}</p>
                </div>
              </Link>
            ))}
          </Reveal>
        </section>
      )}

      <Process />

      {!!quotes?.length && (
        <section className="shell py-28">
          <p className="drawer-label">What clients say</p>
          <Reveal className="mt-12 grid gap-5 md:grid-cols-3">
            {quotes.map((t, i) => (
              <figure key={i} className="card flex flex-col justify-between p-8">
                <blockquote className="text-lg leading-relaxed text-bone-100">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-8 border-t border-ink-600 pt-5">
                  <p className="text-sm font-medium">{t.client_name}</p>
                  <p className="mono-tag mt-1">
                    {[t.role, t.company].filter(Boolean).join(" · ")}
                  </p>
                </figcaption>
              </figure>
            ))}
          </Reveal>
        </section>
      )}

      <CTA />
    </>
  );
}
