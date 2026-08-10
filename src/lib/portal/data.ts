import { createAdminClient } from "@/lib/supabase/server";
import { pdfFilename } from "@/lib/utils";
import { contractPosition, extrasPosition, mergeTotals } from "@/lib/billing";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The portal's reads, in one place.
 *
 * When the portal was one page these all lived inline. Split across five
 * routes, copying them would be how the billing maths starts disagreeing with
 * itself between two screens — which is the single worst bug this product can
 * have, because the client sees both numbers.
 *
 * Four loaders rather than one big one, so the dashboard does not pay for the
 * document signing the documents page needs.
 */

/** Projects, their team, and their milestones. */
export async function loadProjects(clientId: string) {
  const db = createAdminClient();

  const [{ data: projects }, { data: assignments }] = await Promise.all([
    db
      .from("projects")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    db
      .from("client_employee_assignments")
      .select(
        "project_id, employees(id, full_name, email, job_title, seniority, avatar_url, skills)"
      )
      .eq("client_id", clientId),
  ]);

  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ data: milestones }, { data: updates }, { data: changeRequests }] = projectIds.length
    ? await Promise.all([
        db.from("milestones").select("*").in("project_id", projectIds).order("sort_order"),
        // Only logs the team explicitly shared. `blockers` is deliberately not
        // selected — that conversation stays internal.
        db
          .from("daily_work_logs")
          .select("id, project_id, work_date, tasks_completed, employee_name, metrics")
          .in("project_id", projectIds)
          .eq("client_visible", true)
          .order("work_date", { ascending: false })
          .limit(40),
        db
          .from("change_requests")
          .select("id, project_id, title, status")
          .in("project_id", projectIds)
          .in("status", ["requested", "quoted", "invoiced"])
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }];

  // Everyone on this client's work, deduped — an employee assigned to two
  // projects is one person.
  const team = Array.from(
    new Map(
      (assignments ?? [])
        .map((a: any) => a.employees)
        .filter(Boolean)
        .map((e: any) => [e.id, e])
    ).values()
  );

  /** Team for one project, falling back to the whole client team when the
      assignment rows carry no project_id. */
  const teamFor = (projectId: string) => {
    const scoped = (assignments ?? [])
      .filter((a: any) => a.project_id === projectId)
      .map((a: any) => a.employees)
      .filter(Boolean);
    return scoped.length ? Array.from(new Map(scoped.map((e: any) => [e.id, e])).values()) : team;
  };

  return {
    projects: projects ?? [],
    milestones: milestones ?? [],
    updates: updates ?? [],
    changeRequests: changeRequests ?? [],
    team,
    teamFor,
  };
}

/**
 * Money. The delicate part, kept in exactly one function.
 *
 * Contract money and additional items are counted apart: subtracting every
 * payment from the agreed total once made a client who had paid for a domain
 * see a smaller balance on their agreement than they actually owed.
 */
export async function loadBilling(clientId: string) {
  const db = createAdminClient();

  const [{ data: invoices }, { data: deals }, { data: projects }] = await Promise.all([
    db.from("invoices").select("*").eq("client_id", clientId).order("issue_date", { ascending: false }),
    db
      .from("deals")
      .select("id, deal_no, title, total, currency, accepted_at, accepted_name")
      .eq("client_id", clientId)
      .eq("status", "locked"),
    db.from("projects").select("id, deal_id").eq("client_id", clientId),
  ]);

  const projectIds = (projects ?? []).map((p) => p.id);

  const { data: agreedChanges } = projectIds.length
    ? await db
        .from("change_requests")
        .select("id, status, quoted_amount, currency, invoice_id")
        .in("project_id", projectIds)
    : { data: [] as any[] };

  // Second route to the agreement, via the project's own `deal_id`. A deal
  // whose client_id points at a stale duplicate client row would otherwise
  // leave the portal showing no contract value at all.
  const dealIdsViaProjects = (projects ?? []).map((p) => p.deal_id).filter(Boolean) as string[];
  const { data: dealsViaProjects } = dealIdsViaProjects.length
    ? await db.from("deals").select("id, deal_no, title, total, currency, status, accepted_at, accepted_name").in("id", dealIdsViaProjects)
    : { data: [] as any[] };

  const lockedDeals = Array.from(
    new Map(
      [...(deals ?? []), ...(dealsViaProjects ?? []).filter((d: any) => d.status === "locked")].map(
        (d: any) => [d.deal_no, d]
      )
    ).values()
  );

  // A draft is a scheduled stage that has not been issued yet — the client must
  // not see it at all, so it goes before anything else.
  const invoiceRows = (invoices ?? []).filter((i) => i.status !== "draft");

  const contractPos = contractPosition(
    lockedDeals.map((d: any) => ({ ...d, status: "locked" })),
    invoiceRows,
    agreedChanges ?? []
  );
  const extrasPos = extrasPosition(invoiceRows, agreedChanges ?? []);

  const contractValue = contractPos.contracted;

  return {
    invoices: invoiceRows,
    deals: lockedDeals,
    contractValue,
    totalPaid: mergeTotals(contractPos.paid, extrasPos.paid),
    /** Owed on the agreement specifically — not on any extra. */
    balanceOwed: contractPos.outstanding,
    /** Everything owed, of every kind. */
    totalOwed: mergeTotals(contractPos.outstanding, extrasPos.outstanding),
    hasBilling: contractValue.length > 0 || invoiceRows.length > 0,
    billedCurrencies: [
      ...new Set([
        ...contractValue.map((c: any) => c.currency),
        ...invoiceRows.map((i: any) => String(i.currency).toUpperCase()),
      ]),
    ],
  };
}

/** Documents, each with a one-hour signed download URL. */
export async function loadDocuments(clientId: string) {
  const db = createAdminClient();
  const { data: docs } = await db
    .from("documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return Promise.all(
    (docs ?? []).map(async (d) => {
      try {
        // `download` names the saved file after the document, not after its
        // storage key.
        const { data } = await db.storage
          .from("documents")
          .createSignedUrl(d.storage_path, 3600, { download: pdfFilename(d.title) });
        return { ...d, url: data?.signedUrl ?? null };
      } catch {
        return { ...d, url: null };
      }
    })
  );
}

/**
 * Costs the agency paid on the client's behalf — only the ones marked visible.
 *
 * Read on its own rather than inside a Promise.all so that a missing 2027-06
 * migration degrades to "no extras shown" instead of taking the page down with
 * a destructuring error.
 */
export async function loadVisibleExpenses(clientId: string) {
  const { data, error } = await createAdminClient()
    .from("project_expenses")
    .select(
      "id, category, label, vendor, details, bill_amount, currency, incurred_on, renews_on, receipt_url"
    )
    .eq("client_id", clientId)
    .eq("visible_to_client", true)
    .order("incurred_on", { ascending: false });

  if (error) console.error("Portal: could not load expenses", error);
  return data ?? [];
}

/**
 * Meetings for this client.
 *
 * Degrades to an empty list when the 2027-24 migration has not run, rather than
 * taking the dashboard down over a feature the client may not use yet.
 */
export async function loadMeetings(clientId: string, { upcomingOnly = false } = {}) {
  let q = createAdminClient()
    .from("meetings")
    .select("*, projects(id, name)")
    .eq("client_id", clientId)
    .order("starts_at", { ascending: upcomingOnly });

  if (upcomingOnly) {
    q = q.eq("status", "scheduled").gte("starts_at", new Date().toISOString());
  }

  const { data, error } = await q;
  if (error) {
    if (error.code !== "42P01") console.error("Portal: could not load meetings", error);
    return [];
  }
  return data ?? [];
}

/* ============================================================
   FILES, BY CATEGORY
   ============================================================ */

/**
 * The categories a client thinks in — and they span two tables.
 *
 * Proposal, Contract and Invoice are generated PDFs in `documents`; UI Design,
 * Source Code, legal paperwork and Assets are uploads in `project_files`. A
 * client should not have to know which table a file came from, so both are
 * merged here and grouped by what the file IS.
 */
export const FILE_GROUPS = [
  "Proposal",
  "Contract",
  // Was "NDA". Now that the DPA and the security overview are generated too,
  // filing all three under a heading named after only one of them would read
  // as a mistake to whoever came looking for the other two.
  "Legal",
  "UI Design",
  "Source Code",
  "Invoices & Receipts",
  "Reports",
  "Assets",
  "Other",
] as const;

export type FileGroup = (typeof FILE_GROUPS)[number];

/** documents.type is a doc_type enum — this is the whole of it. */
const DOC_TYPE_GROUP: Record<string, FileGroup> = {
  quotation: "Proposal",
  agreement: "Contract",
  invoice: "Invoices & Receipts",
  receipt: "Invoices & Receipts",
  change_order: "Contract",
  progress_report: "Reports",
  handover: "Reports",
  // The compliance paperwork. Without these three the client's own NDA, DPA
  // and security overview fell through to "Other" — findable only by reading
  // every filename in the list.
  nda: "Legal",
  dpa: "Legal",
  security: "Legal",
};

const KIND_GROUP: Record<string, FileGroup> = {
  proposal: "Proposal",
  contract: "Contract",
  nda: "Legal",
  design: "UI Design",
  source: "Source Code",
  assets: "Assets",
  other: "Other",
};

export type PortalFile = {
  id: string;
  name: string;
  url: string | null;
  createdAt: string;
  group: FileGroup;
  sizeBytes?: number | null;
  /** Generated PDFs cannot be deleted by anyone — a client's own contract. */
  generated: boolean;
  visibleToClient: boolean;
};

export async function loadProjectFileGroups(
  projectId: string,
  { clientView = false } = {}
): Promise<{ group: FileGroup; files: PortalFile[] }[]> {
  const db = createAdminClient();

  const [{ data: docs }, { data: uploads }] = await Promise.all([
    db
      .from("documents")
      .select("id, type, title, storage_path, file_size, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    db
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  const signed = async (
    bucket: string,
    path: string,
    filename: string
  ): Promise<string | null> => {
    try {
      const { data } = await db.storage
        .from(bucket)
        .createSignedUrl(path, 3600, { download: filename });
      return data?.signedUrl ?? null;
    } catch {
      return null;
    }
  };

  const fromDocs: PortalFile[] = await Promise.all(
    (docs ?? []).map(async (d: any) => ({
      id: d.id,
      name: d.title,
      url: await signed("documents", d.storage_path, pdfFilename(d.title)),
      createdAt: d.created_at,
      group: DOC_TYPE_GROUP[d.type] ?? "Other",
      sizeBytes: d.file_size,
      generated: true,
      visibleToClient: true,
    }))
  );

  const rawUploads = (uploads ?? []).filter((f: any) =>
    clientView ? f.visible_to_client : true
  );

  const fromUploads: PortalFile[] = await Promise.all(
    rawUploads.map(async (f: any) => ({
      id: f.id,
      name: f.name,
      url: await signed("project-files", f.storage_path, f.name),
      createdAt: f.created_at,
      group: KIND_GROUP[f.kind ?? "other"] ?? "Other",
      sizeBytes: f.file_size,
      generated: false,
      visibleToClient: !!f.visible_to_client,
    }))
  );

  const all = [...fromDocs, ...fromUploads];

  // Fixed order, empty groups dropped. A client should not scroll past six
  // "nothing here" headings to reach the one thing they came for.
  return FILE_GROUPS.map((group) => ({
    group,
    files: all
      .filter((f) => f.group === group)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  })).filter((g) => g.files.length > 0);
}
