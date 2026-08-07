import { createPublicClient } from "@/lib/supabase/public";
import { ogCard, size, contentType } from "@/lib/og";

export { size, contentType };
export const alt = "Nex Desk selected work";

// Prerender one card per page, reusing the page own list so the two can never
// disagree about which slugs exist.
export { generateStaticParams } from "./page";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: study } = await createPublicClient()
    .from("case_studies")
    .select("title,client_name")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return ogCard({
    title: study?.title ?? "Selected Work",
    eyebrow: "Selected Work",
    footnote: study?.client_name ?? null,
  });
}
