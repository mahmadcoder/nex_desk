import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Table } from "@/components/admin/ui";
import EmailComposer from "@/components/admin/EmailComposer";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const db = createAdminClient();
  const [{ data: templates }, { data: clients }, { data: log }] = await Promise.all([
    db.from("email_templates").select("*").eq("is_active", true).order("name"),
    db.from("clients").select("id, name, email, company").eq("is_active", true).order("name"),
    db.from("email_log").select("*").order("sent_at", { ascending: false }).limit(50),
  ]);

  return (
    <>
      <PageHead
        title="Email centre"
        sub={`${templates?.length ?? 0} templates ready. Pick one, edit it, send it.`}
      />

      <EmailComposer templates={templates ?? []} clients={clients ?? []} />

      <section className="mt-10">
        <h2 className="mb-3 text-base">Sent history</h2>
        <Table head={["To", "Subject", "Template", "Status", "When"]}>
          {(log ?? []).map((e) => (
            <tr key={e.id} className="hover:bg-ink-700/30">
              <td className="px-5 py-3">{e.to_email}</td>
              <td className="px-5 py-3 text-bone-400">{e.subject}</td>
              <td className="px-5 py-3"><span className="mono-tag">{e.template_key}</span></td>
              <td className="px-5 py-3">
                <Badge>{e.status}</Badge>
                {e.error && <p className="mt-1 text-xs text-[#F87171]">{e.error}</p>}
              </td>
              <td className="px-5 py-3 text-bone-400">{new Date(e.sent_at).toLocaleString("en-GB")}</td>
            </tr>
          ))}
          {!log?.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-bone-400">Nothing sent yet.</td></tr>}
        </Table>
      </section>
    </>
  );
}
