import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead, Badge } from "@/components/admin/ui";
import { ticketMessages } from "@/lib/actions/tickets";
import TicketWorkspace from "@/components/admin/TicketWorkspace";
import { ArrowLeft } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentStaff();
  if (!me) return null;

  const db = createAdminClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("*, clients(id, name, company), projects(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) notFound();

  // Staff may only open tickets for clients they are assigned to. 404 rather
  // than 403 so the page does not confirm the ticket exists.
  if (!me.isPrivileged) {
    const allowed = await assignedClientIds(me.employeeId);
    if (!allowed.includes(ticket.client_id)) notFound();
  }

  const [messages, { data: employees }] = await Promise.all([
    ticketMessages(id),
    db.from("employees").select("id, full_name").ilike("status", "active").order("full_name"),
  ]);

  return (
    <>
      <Link
        href="/nx-control/tickets"
        className="mono-tag inline-flex items-center gap-1.5 hover:text-lime-400"
      >
        <ArrowLeft size={12} /> tickets
      </Link>

      <PageHead
        title={ticket.subject}
        sub={`${ticket.clients?.name ?? "Client"}${
          ticket.projects?.name ? ` · ${ticket.projects.name}` : ""
        }`}
        action={<Badge>{String(ticket.status).replace(/_/g, " ")}</Badge>}
      />

      <TicketWorkspace
        ticket={ticket}
        messages={messages}
        employees={employees ?? []}
        canAssign={me.isPrivileged}
      />
    </>
  );
}
