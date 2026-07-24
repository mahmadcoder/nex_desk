import { createAdminClient } from "@/lib/supabase/server";
import TestimonialsClient from "@/components/admin/TestimonialsClient";

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const db = createAdminClient();
  const { data: testimonials } = await db
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true });

  return <TestimonialsClient testimonials={testimonials ?? []} />;
}
