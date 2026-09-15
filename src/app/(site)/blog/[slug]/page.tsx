import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import CTA from "@/components/site/CTA";
import TexturePanel from "@/components/site/mockups/TexturePanel";
import { getPostCover } from "@/lib/images";
import { demoPosts } from "@/lib/agencyData";
import { Clock, Calendar, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import { articleLd, breadcrumbLd } from "@/lib/jsonLd";
import ArticleShareBar from "@/components/site/ArticleShareBar";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase.from("posts").select("slug").eq("is_published", true);
    if (data?.length) return data.map((r) => ({ slug: r.slug as string }));
    return demoPosts.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getPost(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (data) return data;
  return demoPosts.find((p) => p.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article — Nex Desk Agency" };
  return {
    title: `${post.title} — Nex Desk Agency`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: `${post.title} — Nex Desk Agency`,
      description: post.excerpt ?? undefined,
      url: `https://nexdesk.agency/blog/${post.slug}`,
      images: [
        {
          url: getPostCover(post.slug, post.cover_url),
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
  };
}

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post: any = await getPost(slug);
  if (!post) notFound();

  // Fetch related articles
  const supabase = createPublicClient();
  const { data: dbAll } = await supabase
    .from("posts")
    .select("slug,title,excerpt,tags,read_minutes,published_at,cover_url")
    .eq("is_published", true);

  const pool: any[] = dbAll?.length ? dbAll : demoPosts;
  const relatedPosts = pool
    .filter((p) => p.slug !== slug)
    .sort((a, b) => {
      const aMatch = (a.tags ?? []).filter((t: string) => (post.tags ?? []).includes(t)).length;
      const bMatch = (b.tags ?? []).filter((t: string) => (post.tags ?? []).includes(t)).length;
      return bMatch - aMatch;
    })
    .slice(0, 3);

  return (
    <>
      <JsonLd data={articleLd(post)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />

      {/* ── Article Header ── */}
      <article className="shell max-w-3xl pt-16 lg:pt-20">
        <Link
          href="/blog"
          className="mono-tag text-xs text-bone-400 hover:text-lime-400 transition-colors inline-flex items-center gap-1.5 mb-8 cursor-pointer"
        >
          <ArrowLeft size={13} /> back to all articles
        </Link>

        {/* Tags */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(post.tags ?? []).map((t: string) => (
            <span
              key={t}
              className="mono-tag rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs text-lime-400 font-mono"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-bold leading-[1.15] tracking-tight text-bone-50">
          {post.title}
        </h1>

        {/* Excerpt Lead */}
        {post.excerpt && (
          <p className="mt-6 text-base sm:text-lg leading-relaxed text-bone-300 font-normal">
            {post.excerpt}
          </p>
        )}

        {/* Meta Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-ink-800 py-4 text-xs font-mono text-bone-400">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.author_avatar || "/ahmad-sadiq.png"}
              alt={post.author_name || "Ahmad Sadiq"}
              className="h-8 w-8 rounded-full border border-ink-600 object-cover"
            />
            <div>
              <p className="font-semibold text-bone-100">{post.author_name || "Ahmad Sadiq"}</p>
              <p className="text-[10px] text-bone-400">
                {post.author_role || "Founder & Lead Architect"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-lime-400" />
              {fmtDate(post.published_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-lime-400" />
              {post.read_minutes ?? 5} min read
            </span>
          </div>
        </div>
      </article>

      {/* ── Cover Image ── */}
      <div className="shell mt-10 max-w-4xl">
        <TexturePanel
          src={getPostCover(post.slug, post.cover_url)}
          className="aspect-[2/1] rounded-2xl border border-ink-700/80 shadow-2xl overflow-hidden"
          overlay={0.25}
        />
      </div>

      {/* ── Article Content Body ── */}
      <article className="shell max-w-3xl py-12 lg:py-16">
        <div className="space-y-6 text-base sm:text-lg leading-[1.85] text-bone-200">
          {String(post.content ?? "")
            .split("\n\n")
            .map((block: string, i: number) => {
              if (block.startsWith("## ")) {
                return (
                  <h2
                    key={i}
                    className="mt-12 mb-4 text-2xl sm:text-3xl font-bold tracking-tight text-bone-50 pt-4"
                  >
                    {block.replace("## ", "")}
                  </h2>
                );
              }
              if (block.startsWith("### ")) {
                return (
                  <h3
                    key={i}
                    className="mt-8 mb-3 text-lg sm:text-xl font-semibold text-bone-100 pt-2"
                  >
                    {block.replace("### ", "")}
                  </h3>
                );
              }
              if (block.startsWith("```")) {
                const lines = block.split("\n");
                const code = lines.slice(1, -1).join("\n");
                return (
                  <div
                    key={i}
                    className="my-6 rounded-xl border border-ink-700 bg-ink-950 p-5 font-mono text-xs sm:text-sm text-lime-400 overflow-x-auto"
                  >
                    <pre>{code}</pre>
                  </div>
                );
              }
              if (block.startsWith("- ")) {
                const items = block
                  .split("\n- ")
                  .map((item) => item.replace("- ", ""));
                return (
                  <ul
                    key={i}
                    className="my-6 space-y-3 rounded-xl border border-ink-700/80 bg-ink-900/60 p-6 text-bone-200"
                  >
                    {items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm sm:text-base leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="text-bone-300 leading-relaxed">
                  {block}
                </p>
              );
            })}
        </div>

        {/* Social Sharing Bar */}
        <ArticleShareBar title={post.title} slug={post.slug} />

        {/* Author Bio Card */}
        <div className="mt-12 card p-8 border-ink-700 bg-ink-900 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.author_avatar || "/ahmad-sadiq.png"}
            alt={post.author_name || "Ahmad Sadiq"}
            className="h-20 w-20 rounded-2xl border border-ink-600 object-cover shrink-0"
          />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-bold text-bone-50">
                {post.author_name || "Ahmad Sadiq"}
              </h3>
              <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded-full border border-lime-400/20">
                {post.author_role || "Founder & Lead Architect"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-bone-300 leading-relaxed">
              Full-stack engineer and solutions architect at Nex Desk. Specializing in sub-second
              Next.js 15 web applications, distributed Supabase architectures, and hardware-accelerated
              interactive motion for founders worldwide.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs font-mono">
              <a
                href="https://github.com/mahmadcoder"
                target="_blank"
                rel="noreferrer"
                className="text-bone-400 hover:text-lime-400 transition-colors inline-flex items-center gap-1"
              >
                GitHub: mahmadcoder <ExternalLink size={12} />
              </a>
              <a
                href="https://ahmad-sadiq-pf.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="text-bone-400 hover:text-lime-400 transition-colors inline-flex items-center gap-1"
              >
                Portfolio <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </article>

      {/* ── Related Articles ("Next to Read") ── */}
      {relatedPosts.length > 0 && (
        <section className="shell py-16 border-t border-ink-800">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="mono-tag text-xs text-lime-400">Continue Reading</span>
              <h2 className="text-xl sm:text-2xl font-bold text-bone-50 mt-1">
                Related Engineering Breakdowns
              </h2>
            </div>
            <Link
              href="/blog"
              className="mono-tag text-xs text-bone-400 hover:text-lime-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              All articles <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {relatedPosts.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="card group flex flex-col justify-between overflow-hidden transition-all duration-200 border-ink-700 bg-ink-900/80 hover:border-lime-400/50 hover:bg-ink-900"
              >
                <div>
                  <TexturePanel
                    src={getPostCover(r.slug, r.cover_url)}
                    className="blog-img-hover h-40"
                    overlay={0.25}
                  />

                  <div className="p-5">
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {(r.tags ?? []).slice(0, 2).map((t: string) => (
                        <span
                          key={t}
                          className="mono-tag text-[10px] text-bone-300 font-mono bg-ink-800 px-2 py-0.5 rounded border border-ink-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-bone-50 group-hover:text-lime-400 transition-colors line-clamp-2">
                      {r.title}
                    </h3>

                    <p className="mt-2 text-xs text-bone-400 leading-relaxed line-clamp-2">
                      {r.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-ink-800 text-[11px] font-mono text-lime-400/80 group-hover:text-lime-400 transition-colors flex items-center justify-between">
                    <span>Read guide →</span>
                    <span className="text-bone-400">{r.read_minutes ?? 5} min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom Conversion CTA ── */}
      <CTA />
    </>
  );
}
