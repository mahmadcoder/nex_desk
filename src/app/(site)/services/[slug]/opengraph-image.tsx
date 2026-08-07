import { createPublicClient } from "@/lib/supabase/public";
import { demoServices } from "@/lib/agencyData";
import { money } from "@/lib/utils";
import { ogCard, size, contentType } from "@/lib/og";

export { size, contentType };
export const alt = "Nex Desk service";

// Prerender one card per page, reusing the page own list so the two can never
// disagree about which slugs exist.
export { generateStaticParams } from "./page";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Same fallback every other surface uses, so an empty database still renders
  // a card instead of a 500 in someone's WhatsApp preview.
  const { data } = await createPublicClient()
    .from("services")
    .select("title,category,starting_at,currency,duration_note")
    .eq("slug", slug)
    .maybeSingle();

  const service: any = data ?? demoServices.find((s: any) => s.slug === slug);

  if (!service) {
    return ogCard({ title: "Nex Desk", eyebrow: "Services" });
  }

  const price = Number(service.starting_at);
  const footnote = [
    Number.isFinite(price) && price > 0 ? `from ${money(price, service.currency ?? "USD")}` : null,
    service.duration_note,
  ]
    .filter(Boolean)
    .join(" · ");

  return ogCard({
    title: service.title,
    eyebrow: service.category ?? "Services",
    footnote: footnote || null,
  });
}
