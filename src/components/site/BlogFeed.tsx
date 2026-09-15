"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, Calendar, Search, X, Sparkles, Check, ArrowRight } from "lucide-react";
import TexturePanel from "@/components/site/mockups/TexturePanel";
import { getPostCover } from "@/lib/images";
import type { DemoPost } from "@/types/agency";
import { toast } from "sonner";

const CATEGORIES = [
  "All",
  "Engineering",
  "Architecture",
  "Performance",
  "Design",
  "AI",
  "Process",
];

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

export default function BlogFeed({ posts }: { posts: DemoPost[] }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Newsletter state
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // Category filter
      const matchesCategory =
        activeCategory === "All" ||
        (p.tags ?? []).some((t) =>
          t.toLowerCase().includes(activeCategory.toLowerCase())
        );

      // Search filter
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [posts, activeCategory, searchQuery]);

  const showFeatured = activeCategory === "All" && !searchQuery.trim() && filteredPosts.length > 0;
  const featured = showFeatured ? filteredPosts[0] : null;
  const gridPosts = showFeatured ? filteredPosts.slice(1) : filteredPosts;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscribed(true);
        toast.success(data.message || "Successfully subscribed to engineering insights!");
        setEmail("");
      } else {
        toast.error(data.error || "Subscription failed. Please try again.");
      }
    } catch {
      toast.error("Could not complete subscription. Please try again later.");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* ── Search & Filter Controls ── */}
      <div className="shell">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between pt-4 pb-2 border-b border-ink-800">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`mono-tag text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                    isActive
                      ? "bg-lime-400 text-lime-950 border-lime-400 font-semibold shadow-[0_0_12px_rgba(208,255,78,0.2)]"
                      : "bg-ink-900/80 text-bone-300 border-ink-700 hover:border-lime-400/40 hover:text-bone-100"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bone-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search articles & topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs bg-ink-900 border border-ink-700 rounded-full text-bone-100 placeholder:text-bone-400 focus:outline-none focus:border-lime-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-400 hover:text-bone-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Featured Post (Only when viewing All & No Search) ── */}
      {featured && (
        <section className="shell">
          <Link
            href={`/blog/${featured.slug}`}
            className="card group grid overflow-hidden transition-colors border-ink-700 hover:border-lime-400/50 bg-ink-900/90 lg:grid-cols-2"
          >
            <TexturePanel
              src={getPostCover(featured.slug, featured.cover_url)}
              className="blog-img-hover min-h-[300px] lg:min-h-[400px]"
              overlay={0.3}
            >
              <div className="flex h-full items-end p-8">
                <span className="mono-tag relative z-10 rounded-full bg-lime-400 px-3.5 py-1.5 text-xs font-semibold text-lime-950 flex items-center gap-1.5 shadow-lg">
                  <Sparkles size={12} /> Featured Article
                </span>
              </div>
            </TexturePanel>

            <div className="flex flex-col justify-between p-8 lg:p-12">
              <div>
                <div className="flex flex-wrap gap-2">
                  {(featured.tags ?? []).map((t: string) => (
                    <span
                      key={t}
                      className="mono-tag rounded-full border border-ink-600 bg-ink-800/80 px-2.5 py-1 text-[11px] text-lime-400/90 font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <h2 className="mt-5 text-2xl sm:text-3xl font-bold leading-tight text-bone-50 transition-colors group-hover:text-lime-400">
                  {featured.title}
                </h2>
                <p className="mt-4 text-sm sm:text-base leading-relaxed text-bone-300">
                  {featured.excerpt}
                </p>
              </div>

              {/* Author & Meta */}
              <div className="mt-8 pt-6 border-t border-ink-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.author_avatar || "/ahmad-sadiq.png"}
                    alt={featured.author_name || "Ahmad Sadiq"}
                    className="h-9 w-9 rounded-full border border-ink-600 object-cover"
                  />
                  <div>
                    <p className="text-xs font-semibold text-bone-100">
                      {featured.author_name || "Ahmad Sadiq"}
                    </p>
                    <p className="mono-tag text-[10px] text-bone-400">
                      {featured.author_role || "Founder & Solutions Architect"}
                    </p>
                  </div>
                </div>

                <div className="mono-tag flex items-center gap-4 text-xs text-bone-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-lime-400" />
                    {fmtDate(featured.published_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-lime-400" />
                    {featured.read_minutes ?? 6} min
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ── Article Grid ── */}
      <section className="shell">
        {gridPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {gridPosts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="card group flex flex-col justify-between overflow-hidden transition-all duration-200 border-ink-700 bg-ink-900/80 hover:border-lime-400/50 hover:bg-ink-900"
              >
                <div>
                  <TexturePanel
                    src={getPostCover(p.slug, p.cover_url)}
                    className="blog-img-hover h-48"
                    overlay={0.25}
                  />

                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {(p.tags ?? []).slice(0, 2).map((t: string) => (
                        <span
                          key={t}
                          className="mono-tag rounded-full border border-ink-700 bg-ink-800/80 px-2.5 py-0.5 text-[10px] text-bone-300 font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <h3 className="mt-4 text-lg font-semibold leading-snug text-bone-50 transition-colors group-hover:text-lime-400 line-clamp-2">
                      {p.title}
                    </h3>

                    <p className="mt-3 text-xs leading-relaxed text-bone-300 line-clamp-3">
                      {p.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <div className="flex items-center justify-between pt-4 border-t border-ink-800/80 text-[11px] font-mono text-bone-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-lime-400" />
                      {fmtDate(p.published_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="text-lime-400" />
                      {p.read_minutes ?? 5} min read
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center border-ink-700 bg-ink-900/60 max-w-lg mx-auto space-y-4">
            <p className="text-base font-semibold text-bone-50">No matching articles found</p>
            <p className="text-xs text-bone-400">
              We couldn&apos;t find any articles matching &ldquo;{searchQuery || activeCategory}&rdquo;.
            </p>
            <button
              onClick={() => {
                setActiveCategory("All");
                setSearchQuery("");
              }}
              className="btn btn-primary h-9 px-4 text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* ── Newsletter Subscription Section ── */}
      <section className="shell py-12">
        <div className="card p-8 sm:p-12 border-lime-400/30 bg-ink-900/90 relative overflow-hidden">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <span className="mono-tag text-xs text-lime-400 bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/20 inline-flex items-center gap-1.5">
                <Sparkles size={12} /> The Engineering Dispatch
              </span>
              <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-bone-50 leading-tight">
                Get our latest technical breakdowns & open-source architectures.
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-bone-300 leading-relaxed max-w-xl">
                Deep dives on Next.js 15, distributed PostgreSQL, 60 FPS motion, and candid agency
                lessons. Delivered once a month with zero marketing fluff.
              </p>
            </div>

            <div>
              {subscribed ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 text-sm">
                  <Check size={18} className="shrink-0" />
                  <span>You&apos;re subscribed! Check your inbox for our welcome guide.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    placeholder="Enter your work email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 px-4 text-xs bg-ink-950 border border-ink-700 rounded-lg text-bone-100 placeholder:text-bone-500 focus:outline-none focus:border-lime-400 transition-colors flex-1"
                  />
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="btn btn-primary h-11 px-6 text-xs font-semibold cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2"
                  >
                    {subscribing ? "Subscribing..." : "Subscribe →"}
                  </button>
                </form>
              )}
              <p className="mt-3 text-[11px] text-bone-400 font-mono">
                Join 400+ founders and developers. Unsubscribe at any time with one click.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
