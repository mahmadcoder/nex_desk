import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import CTA from "@/components/site/CTA";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/jsonLd";
import { demoPosts } from "@/lib/agencyData";
import BlogFeed from "@/components/site/BlogFeed";
import type { DemoPost } from "@/types/agency";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Engineering Journal & Insights — Nex Desk Agency",
  description:
    "Technical strategies, architecture patterns, and candid agency lessons on shipping sub-second web applications, SaaS MVPs, and fluid interactive experiences by Ahmad Sadiq.",
  openGraph: {
    title: "Engineering Journal & Insights — Nex Desk Agency",
    description:
      "Technical strategies, architecture patterns, and candid agency lessons on shipping sub-second web applications and modern SaaS products.",
    url: "https://nexdesk.agency/blog",
  },
};

export const revalidate = 300;

export default async function BlogPage() {
  const supabase = createPublicClient();
  const { data: dbPosts } = await supabase
    .from("posts")
    .select("slug,title,excerpt,tags,read_minutes,published_at,cover_url")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const posts: DemoPost[] = dbPosts?.length ? (dbPosts as DemoPost[]) : demoPosts;

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />

      {/* ── Editorial Hero Banner ── */}
      <section className="relative overflow-hidden py-16 lg:py-24 bg-ink-950 border-b border-ink-800">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-80 w-full max-w-6xl bg-radial-glow opacity-25 blur-3xl" />

        <div className="shell relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="mono-tag text-xs bg-lime-400/10 text-lime-400 px-3 py-1 rounded-full border border-lime-400/20 font-medium flex items-center gap-1.5">
                  <Sparkles size={12} /> The Nex Desk Journal
                </span>
                <span className="mono-tag text-xs text-bone-400 border border-ink-700 px-2.5 py-1 rounded-full">
                  Engineering &amp; Craft
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-bone-50 leading-[1.12]">
                Insights, Architectures &amp;{" "}
                <span className="text-lime-400">Lessons from the Desk.</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-bone-200 leading-relaxed max-w-2xl">
                Candid technical breakdowns, Next.js 15 architecture patterns, design system
                guidelines, and agency lessons from shipping software that actually works.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="hidden lg:flex flex-col gap-2 p-5 rounded-2xl border border-ink-700 bg-ink-900/60 shrink-0 text-xs font-mono">
              <div className="flex items-center justify-between gap-6 text-bone-300">
                <span>Published Articles</span>
                <span className="text-lime-400 font-bold">{posts.length} Guides</span>
              </div>
              <div className="flex items-center justify-between gap-6 text-bone-300">
                <span>Primary Focus</span>
                <span className="text-bone-100">Next.js &amp; Architecture</span>
              </div>
              <div className="flex items-center justify-between gap-6 text-bone-300">
                <span>Editorial Author</span>
                <span className="text-bone-100">Ahmad Sadiq</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Blog Feed (Category tabs, Search, Featured, Grid, Newsletter) ── */}
      <div className="py-12">
        <BlogFeed posts={posts} />
      </div>

      {/* ── Bottom Conversion CTA ── */}
      <CTA />
    </>
  );
}
