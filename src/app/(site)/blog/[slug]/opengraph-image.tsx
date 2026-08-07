import { createPublicClient } from "@/lib/supabase/public";
import { ogCard, size, contentType } from "@/lib/og";

export { size, contentType };
export const alt = "Nex Desk journal";

// Prerender one card per page, reusing the page own list so the two can never
// disagree about which slugs exist.
export { generateStaticParams } from "./page";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: post } = await createPublicClient()
    .from("posts")
    .select("title,tags,read_minutes")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  // `posts` has tags, not a single category — the first one reads as the
  // section label.
  return ogCard({
    title: post?.title ?? "Nex Desk Journal",
    eyebrow: post?.tags?.[0] ?? "Journal",
    footnote: post?.read_minutes ? `${post.read_minutes} min read` : null,
  });
}
