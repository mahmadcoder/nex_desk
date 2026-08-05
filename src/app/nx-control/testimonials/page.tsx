import { createAdminClient } from "@/lib/supabase/server";
import TestimonialsClient from "@/components/admin/TestimonialsClient";

export const metadata = { title: "Testimonials" };
export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const db = createAdminClient();
  const [{ data: testimonials }, { data: projects }] = await Promise.all([
    db.from("testimonials").select("*").order("sort_order", { ascending: true }),
    // Delivered projects, so a testimonial can be tied to the work it is about.
    // Without that link the daily cron's "they already gave feedback" check
    // never matches and clients get asked again after they have answered.
    db
      .from("projects")
      .select("id, name, clients(name, company)")
      .not("handed_over_at", "is", null)
      .order("handed_over_at", { ascending: false }),
  ]);

  return (
    <TestimonialsClient
      testimonials={testimonials ?? []}
      projects={(projects ?? []) as any[]}
    />
  );
}
