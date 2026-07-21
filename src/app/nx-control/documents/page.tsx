import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Table, Empty } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const db = createAdminClient();
  const { data: docs } = await db.from("documents")
    .select("*, clients(name)").order("created_at", { ascending: false }).limit(100);

  // sign fresh URLs so links never expire in the UI
  const withUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await db.storage.from("documents").createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl };
    })
  );

  return (
    <>
      <PageHead title="Documents" sub="Every PDF this system has generated and sent." />
      {!withUrls.length ? (
        <Empty title="No documents yet" body="Agreements, invoices and receipts appear here as they're generated." />
      ) : (
        <Table head={["Document", "Type", "Client", "Size", "Created", ""]}>
          {withUrls.map((d) => (
            <tr key={d.id} className="hover:bg-ink-700/30">
              <td className="px-5 py-3">{d.title}</td>
              <td className="px-5 py-3"><Badge>{d.type}</Badge></td>
              <td className="px-5 py-3 text-bone-400">{(d.clients as any)?.name ?? "—"}</td>
              <td className="px-5 py-3 text-bone-400">{Math.round((d.file_size ?? 0) / 1024)} KB</td>
              <td className="px-5 py-3 text-bone-400">{new Date(d.created_at).toLocaleString("en-GB")}</td>
              <td className="px-5 py-3 text-right">
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="mono-tag hover:text-lime-400">download →</a>}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
