"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { adminPath } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SearchHit = {
  kind: "client" | "project" | "invoice" | "lead" | "employee";
  title: string;
  sub: string;
  href: string;
};

/**
 * One search across everything the panel manages, for the Ctrl+K palette.
 *
 * Scoped by role the same way the pages are: staff search only the clients
 * they are assigned to and those clients' projects — no invoices, leads or
 * payroll. The scoping happens here, server-side; the palette is just a view.
 */
export async function globalSearch(query: string): Promise<SearchHit[]> {
  const me = await getCurrentStaff();
  if (!me) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  // % and _ are wildcards inside ilike — a user typing them means the literal.
  const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
  const db = createAdminClient();
  const hits: SearchHit[] = [];

  if (me.isPrivileged) {
    const [clients, projects, invoices, leads, employees] = await Promise.all([
      db.from("clients").select("id, name, email, company")
        .or(`name.ilike.${like},email.ilike.${like},company.ilike.${like}`).limit(5),
      db.from("projects").select("id, name, clients(name)")
        .ilike("name", like).limit(5),
      db.from("invoices").select("id, invoice_no, total, currency, status, clients(name)")
        .ilike("invoice_no", like).limit(5),
      db.from("leads").select("id, name, email, status")
        .or(`name.ilike.${like},email.ilike.${like}`).neq("status", "spam").limit(5),
      db.from("employees").select("id, full_name, job_title")
        .ilike("full_name", like).limit(5),
    ]);

    for (const c of clients.data ?? []) {
      hits.push({
        kind: "client",
        title: c.name,
        sub: [c.company, c.email].filter(Boolean).join(" · "),
        href: adminPath(`/clients/${c.id}`),
      });
    }
    for (const p of projects.data ?? []) {
      hits.push({
        kind: "project",
        title: p.name,
        sub: (p.clients as any)?.name ?? "",
        href: adminPath(`/projects/${p.id}`),
      });
    }
    for (const i of invoices.data ?? []) {
      hits.push({
        kind: "invoice",
        title: i.invoice_no,
        sub: `${(i.clients as any)?.name ?? ""} · ${i.currency} ${Number(i.total).toLocaleString()} · ${i.status}`,
        href: adminPath("/invoices"),
      });
    }
    for (const l of leads.data ?? []) {
      hits.push({
        kind: "lead",
        title: l.name,
        sub: `${l.email} · ${l.status}`,
        href: adminPath("/leads"),
      });
    }
    for (const e of employees.data ?? []) {
      hits.push({
        kind: "employee",
        title: e.full_name,
        sub: e.job_title ?? "",
        href: adminPath(`/employees/${e.id}`),
      });
    }
    return hits;
  }

  // Staff: their assigned clients and those clients' projects, nothing else.
  const allowed = await assignedClientIds(me.employeeId);
  if (!allowed.length) return [];

  const [clients, projects] = await Promise.all([
    db.from("clients").select("id, name, company").in("id", allowed)
      .or(`name.ilike.${like},company.ilike.${like}`).limit(5),
    db.from("projects").select("id, name, clients(name)").in("client_id", allowed)
      .ilike("name", like).limit(5),
  ]);

  for (const c of clients.data ?? []) {
    hits.push({ kind: "client", title: c.name, sub: c.company ?? "", href: adminPath(`/clients/${c.id}`) });
  }
  for (const p of projects.data ?? []) {
    hits.push({
      kind: "project",
      title: p.name,
      sub: (p.clients as any)?.name ?? "",
      href: adminPath(`/projects/${p.id}`),
    });
  }
  return hits;
}
