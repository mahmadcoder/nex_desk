import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Reveal from "@/components/site/Reveal";
import CTA from "@/components/site/CTA";
import TexturePanel from "@/components/site/mockups/TexturePanel";
import { getPostCover } from "@/lib/images";
import { demoPosts } from "@/lib/demo";
import { Clock } from "lucide-react";

export const metadata: Metadata = { title: "Journal" };
export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: dbPosts } = await supabase
    .from("posts")
    .select("slug,title,excerpt,tags,read_minutes,published_at,cover_url")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const posts: any[] = dbPosts?.length ? dbPosts : demoPosts;
  const [featured, ...rest] = posts;

  return (
    <>
      <section className="shell py-24">
        <p className="drawer-label">Journal</p>
        <h1 className="mt-8 max-w-2xl text-[var(--text-h1)]">Notes from the desk.</h1>
        <p className="mt-6 max-w-xl text-lg text-bone-200">
          How we work, what we&apos;ve learned, and the occasional strong opinion about
          shipping software.
        </p>
      </section>

      {/* featured */}
      <section className="shell">
        <Reveal>
          <Link href={`/blog/${featured.slug}`} className="card group grid overflow-hidden lg:grid-cols-2">
            <TexturePanel src={getPostCover(featured.slug, featured.cover_url)} className="min-h-[280px]" overlay={0.3}>
              <div className="flex h-full items-end p-8">
                <span className="mono-tag rounded-full bg-lime-400 px-3 py-1 text-lime-950">featured</span>
              </div>
            </TexturePanel>
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <div className="flex flex-wrap gap-2">
                {(featured.tags ?? []).slice(0, 2).map((t: string) => (
                  <span key={t} className="mono-tag">{t}</span>
                ))}
              </div>
              <h2 className="mt-4 text-3xl group-hover:text-lime-400">{featured.title}</h2>
              <p className="mt-4 text-bone-400">{featured.excerpt}</p>
              <div className="mono-tag mt-6 flex items-center gap-4">
                <span>{fmtDate(featured.published_at)}</span>
                <span className="flex items-center gap-1.5"><Clock size={12} /> {featured.read_minutes ?? 5} min</span>
              </div>
            </div>
          </Link>
        </Reveal>
      </section>

      {/* grid */}
      <section className="shell py-16">
        <Reveal className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card group flex flex-col overflow-hidden hover:border-lime-400/40">
              <TexturePanel src={getPostCover(p.slug, p.cover_url)} className="h-48" overlay={0.3} />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex flex-wrap gap-2">
                  {(p.tags ?? []).slice(0, 2).map((t: string) => (
                    <span key={t} className="mono-tag">{t}</span>
                  ))}
                </div>
                <h3 className="mt-3 text-xl group-hover:text-lime-400">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm text-bone-400">{p.excerpt}</p>
                <div className="mono-tag mt-5 flex items-center gap-3 border-t border-ink-600 pt-4">
                  <span>{fmtDate(p.published_at)}</span>
                  <span className="flex items-center gap-1.5"><Clock size={11} /> {p.read_minutes ?? 5} min</span>
                </div>
              </div>
            </Link>
          ))}
        </Reveal>
      </section>

      <CTA />
    </>
  );
}
