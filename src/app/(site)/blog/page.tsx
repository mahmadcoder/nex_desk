import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Journal" };
export const revalidate = 300;

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase.from("posts")
    .select("slug,title,excerpt,tags,read_minutes,published_at")
    .eq("is_published", true).order("published_at", { ascending: false });

  return (
    <section className="shell py-24">
      <p className="drawer-label">Journal</p>
      <h1 className="mt-8 max-w-2xl text-[var(--text-h1)]">Notes from the desk.</h1>

      {!posts?.length ? (
        <div className="card mt-14 p-16 text-center">
          <h2 className="text-2xl">Nothing published yet</h2>
          <p className="mx-auto mt-3 max-w-sm text-bone-400">
            Write your first post from the admin panel and it appears here.
          </p>
        </div>
      ) : (
        <div className="mt-14 divide-y divide-ink-600 border-y border-ink-600">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col gap-3 py-8 md:flex-row md:items-baseline md:gap-10">
              <span className="mono-tag shrink-0 md:w-32">
                {p.published_at ? new Date(p.published_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}
              </span>
              <div>
                <h2 className="text-2xl group-hover:text-lime-400">{p.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-bone-400">{p.excerpt}</p>
              </div>
              <span className="mono-tag ml-auto shrink-0">{p.read_minutes ?? 4} min</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
