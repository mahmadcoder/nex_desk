import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { createAdminClient } from "@/lib/supabase/server";
import { ticketMessages } from "@/lib/actions/tickets";
import TicketThread from "@/components/portal/TicketThread";
import { Badge } from "@/components/admin/ui";
import { fmtDate } from "@/lib/datetime";
import { ArrowLeft } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

const SAYS: Record<string, string> = {
  open: "With us",
  in_progress: "Being worked on",
  waiting_client: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function PortalTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const { data: ticket } = await createAdminClient()
    .from("tickets")
    .select("*, projects(name)")
    .eq("id", id)
    .maybeSingle();

  // Scoped to this client's own tickets — another client's id must 404, not
  // render, and not confirm the ticket exists.
  if (!ticket || ticket.client_id !== session.client.id) notFound();

  // `clientView` strips internal notes server-side.
  const messages = await ticketMessages(id, { clientView: true });

  return (
    <>
      <Link
        href="/portal/support"
        className="mono-tag inline-flex items-center gap-1.5 text-bone-400 hover:text-lime-400"
      >
        <ArrowLeft size={12} /> Support
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-ink-600 pb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight text-bone-50">{ticket.subject}</h1>
          <p className="mono-tag mt-2 text-[10px]">
            Reported {fmtDate(ticket.created_at)}
            {ticket.projects?.name ? ` · ${ticket.projects.name}` : ""}
          </p>
        </div>
        <Badge>{SAYS[ticket.status] ?? ticket.status}</Badge>
      </header>

      <div className="mt-6">
        <TicketThread
          ticketId={id}
          original={{
            body: ticket.body,
            at: ticket.created_at,
            who: ticket.raised_by_name ?? "You",
          }}
          messages={messages}
          resolved={["resolved", "closed"].includes(ticket.status)}
          readOnly={session.isPaused}
        />
      </div>
    </>
  );
}
