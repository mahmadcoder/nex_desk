import { requireOwnerAdmin } from "@/lib/auth/guards";
import { PageHead } from "@/components/admin/ui";
import { listIntakeRequests } from "@/lib/actions/intake";
import RequestDetailsClient, { IntakeRow } from "@/components/admin/RequestDetailsClient";
import { Inbox } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";

/**
 * Details requested, and details received.
 *
 * Owner/admin only — a submitted payload holds someone's address, bank details
 * and phone number before they are on the team.
 */
export default async function IntakePage() {
  await requireOwnerAdmin();
  const rows = await listIntakeRequests();

  const waiting = rows.filter((r: any) => r.status === "submitted");
  const pending = rows.filter((r: any) => r.status === "pending");
  const closed = rows.filter((r: any) => ["approved", "revoked"].includes(r.status));

  return (
    <>
      <PageHead
        title="Onboarding"
        sub={
          waiting.length
            ? `${waiting.length} ready to add.`
            : "Send someone a link after a call and their details land here."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <RequestDetailsClient kind="client" />
            <RequestDetailsClient kind="staff" />
          </div>
        }
      />

      {!rows.length ? (
        <div className="card mt-6 p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-bone-500" aria-hidden />
          <p className="mt-4 text-sm text-bone-200">Nothing requested yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-bone-400">
            After a call, press Request details. You get a message for WhatsApp, a PDF and a
            link — whichever suits the person.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <Group title="Ready to add" rows={waiting} />
          <Group title="Waiting on them" rows={pending} />
          <Group title="Done" rows={closed} />
        </div>
      )}
    </>
  );
}

function Group({ title, rows }: { title: string; rows: any[] }) {
  if (!rows.length) return null;

  return (
    <section>
      <h2 className="mono-tag mb-3">
        {title} <span className="text-bone-500">({rows.length})</span>
      </h2>
      <ul className="card divide-y divide-ink-600">
        {rows.map((r) => (
          <IntakeRow key={r.id} row={r} />
        ))}
      </ul>
    </section>
  );
}
