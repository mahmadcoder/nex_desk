import { createAdminClient } from "@/lib/supabase/server";
import BlogClient from "@/components/admin/BlogClient";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const db = createAdminClient();
  const { data: posts } = await db
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  return <BlogClient posts={posts ?? []} />;
}
