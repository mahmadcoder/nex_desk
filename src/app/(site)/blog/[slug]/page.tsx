import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("title,excerpt,seo_title,seo_desc").eq("slug", slug).single();
  return { title: data?.seo_title ?? data?.title ?? "Post", description: data?.seo_desc ?? data?.excerpt ?? undefined };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("*").eq("slug", slug).eq("is_published", true).single();
  if (!post) notFound();

  return (
    <article className="shell max-w-3xl py-16">
      <p className="mono-tag">
        {post.published_at ? new Date(post.published_at).toLocaleDateString("en-GB", { dateStyle: "long" }) : ""}
        {" · "}{post.read_minutes ?? 4} min read
      </p>
      <h1 className="mt-6 text-[var(--text-h1)]">{post.title}</h1>
      {post.excerpt && <p className="mt-6 text-lg text-bone-200">{post.excerpt}</p>}
      <div className="mt-12 whitespace-pre-line leading-[1.8] text-bone-100">{post.content}</div>
    </article>
  );
}
