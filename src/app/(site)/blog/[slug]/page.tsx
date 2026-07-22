import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CTA from "@/components/site/CTA";
import TexturePanel from "@/components/site/mockups/TexturePanel";
import { avatar, getPostCover } from "@/lib/images";
import { demoPosts } from "@/lib/demo";
import { Clock, Calendar } from "lucide-react";

export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getPost(slug: string) {
  const supabase = await createClient();
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
  return { title: post?.title ?? "Post", description: post?.excerpt ?? undefined };
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

  return (
    <>
      {/* Article Header */}
      <article className="shell max-w-3xl pt-20">
        <Link href="/blog" className="mono-tag hover:text-bone-50">
          ← journal
        </Link>

        {/* Tags with proper spacing */}
        <div className="mt-8 mb-6 flex flex-wrap gap-2.5">
          {(post.tags ?? []).map((t: string) => (
            <span
              key={t}
              className="mono-tag rounded-full border border-ink-600 bg-ink-900/80 px-3.5 py-1 text-xs text-bone-200"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-medium leading-[1.1] tracking-tight text-bone-50">
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mt-6 text-xl leading-relaxed text-bone-300 font-normal">
            {post.excerpt}
          </p>
        )}

        {/* Meta Bar */}
        <div className="mono-tag mt-8 flex flex-wrap items-center gap-6 border-y border-ink-700/80 py-5 text-sm text-bone-400">
          <span className="flex items-center gap-2">
            <Calendar size={14} className="text-lime-400" />
            {fmtDate(post.published_at)}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={14} className="text-lime-400" />
            {post.read_minutes ?? 5} min read
          </span>
        </div>
      </article>

      {/* Cover Image */}
      <div className="shell mt-10 max-w-4xl">
        <TexturePanel
          src={getPostCover(post.slug, post.cover_url)}
          className="aspect-[2/1] rounded-2xl border border-ink-700/80 shadow-2xl"
          overlay={0.3}
        />
      </div>

      {/* Article Body */}
      <article className="shell max-w-3xl py-16">
        <div className="space-y-6 text-lg leading-[1.85] text-bone-200">
          {String(post.content ?? "")
            .split("\n\n")
            .map((block: string, i: number) => {
              if (block.startsWith("## ")) {
                return (
                  <h2
                    key={i}
                    className="mt-12 mb-4 text-2xl sm:text-3xl font-semibold tracking-tight text-bone-50"
                  >
                    {block.replace("## ", "")}
                  </h2>
                );
              }
              if (block.startsWith("### ")) {
                return (
                  <h3
                    key={i}
                    className="mt-8 mb-3 text-xl font-semibold text-bone-100"
                  >
                    {block.replace("### ", "")}
                  </h3>
                );
              }
              if (block.startsWith("- ")) {
                const items = block
                  .split("\n- ")
                  .map((item) => item.replace("- ", ""));
                return (
                  <ul
                    key={i}
                    className="my-6 space-y-3 rounded-xl border border-ink-700/60 bg-ink-900/40 p-6 text-bone-200"
                  >
                    {items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-base">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return <p key={i}>{block}</p>;
            })}
        </div>

        {/* Author Bio */}
        <div className="mt-16 flex items-center gap-4 rounded-2xl border border-ink-700/60 bg-ink-900/40 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar("nexdesk-team")}
            alt=""
            className="h-12 w-12 rounded-full border border-ink-600"
          />
          <div>
            <p className="text-base font-semibold text-bone-100">The Nex Desk Team</p>
            <p className="mono-tag mt-0.5 text-xs text-bone-400">
              Writing from Islamabad · working worldwide
            </p>
          </div>
        </div>
      </article>

      <CTA />
    </>
  );
}
