import { createAdminClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/admin/ui";
import DocumentTemplatesHub from "@/components/admin/DocumentTemplatesHub";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const db = createAdminClient();
  const { data: docs } = await db
    .from("documents")
    .select("*, clients(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  // Sign fresh URLs so links never expire in the UI
  const withUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await db.storage.from("documents").createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl };
    })
  );

  return (
    <>
      <PageHead
        title="Agency Document Center"
        sub="Standard legal agreements, contract templates, and generated client PDFs."
      />
      <DocumentTemplatesHub clientDocs={withUrls} />
    </>
  );
}
