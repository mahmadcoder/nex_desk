import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Table } from "@/components/admin/ui";
import EmailComposer from "@/components/admin/EmailComposer";
import { fmtDateTime } from "@/lib/datetime";
import { MailOpen } from "lucide-react";
import ResendEmailButton from "@/components/admin/ResendEmailButton";

export const metadata = { title: "Email Centre" };
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

        {/* Said plainly, because the team will otherwise read this column as
            delivery confirmation and chase the wrong people. */}
        <p className="mb-3 max-w-2xl text-xs leading-relaxed text-bone-400">
          <span className="text-bone-300">About “Opened”:</span> it is a signal, not
          proof. Most mail apps block remote images by default, so “not opened” often
          just means images were off — while Gmail pre-fetches images, so an open can
          register before anyone has really read it. Trust an open more than you
          distrust a blank.
        </p>

        <Table head={["To", "Subject", "Template", "Status", "When", "Opened"]}>
          {(log ?? []).map((e) => (
            <tr key={e.id} className="hover:bg-ink-700/30">
              <td className="px-5 py-3">{e.to_email}</td>
              <td className="px-5 py-3 text-bone-400">{e.subject}</td>
              <td className="px-5 py-3"><span className="mono-tag">{e.template_key}</span></td>
              <td className="px-5 py-3">
                <Badge>{e.status}</Badge>
                {/* >1 means Gmail pushed back and the retry loop won. Worth
                    seeing before it becomes a failure. */}
                {e.attempts > 1 && (
                  <span className="ml-1.5 text-[11px] text-bone-400">
                    {e.attempts} tries
                  </span>
                )}
                {e.error && <p className="mt-1 text-xs text-[#F87171]">{e.error}</p>}
                {e.status === "failed" && (
                  <div className="mt-2">
                    <ResendEmailButton
                      logId={e.id}
                      disabledReason={
                        !e.send_args
                          ? "Sent before resend existed — compose it again."
                          : e.send_args.hadRawAttachments
                            ? "Had a generated attachment — resend from where it came from."
                            : null
                      }
                    />
                  </div>
                )}
              </td>
              <td className="px-5 py-3 text-bone-400">{fmtDateTime(e.sent_at)}</td>
              <td className="px-5 py-3">
                {e.opened_at ? (
                  <span className="inline-flex items-center gap-1.5 text-lime-400">
                    <MailOpen size={13} aria-hidden />
                    {fmtDateTime(e.opened_at)}
                  </span>
                ) : (
                  <span className="text-bone-500">—</span>
                )}
              </td>
            </tr>
          ))}
          {!log?.length && <tr><td colSpan={6} className="px-5 py-8 text-center text-bone-400">Nothing sent yet.</td></tr>}
        </Table>
      </section>
    </>
  );
}
