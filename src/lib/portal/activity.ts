/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * What has happened lately, for the client.
 *
 * Derived, not stored. The portal already loads projects, milestones, invoices
 * and documents on every visit; a separate activity table would be a second
 * source of truth that could disagree with the first one — and would only ever
 * record events written after it shipped, so history would start empty.
 *
 * `notifications` was the other candidate and is the wrong shape: its
 * `audience` is only ever `admins` or `employee`, so nothing in it is addressed
 * to a client.
 */

export type ActivityKind =
  | "project.started"
  | "project.delivered"
  | "milestone.completed"
  | "milestone.approved"
  | "invoice.issued"
  | "invoice.paid"
  | "document.shared"
  | "staging.shared";

export type ActivityItem = {
  kind: ActivityKind;
  at: string;
  title: string;
  detail?: string | null;
  projectId?: string | null;
  href?: string | null;
};

type Sources = {
  projects?: any[];
  milestones?: any[];
  invoices?: any[];
  documents?: any[];
};

/**
 * Merges what the caller already has into one reverse-chronological feed.
 *
 * @param limit  0 ⇒ everything, for the per-project timeline.
 * @param projectId  Present ⇒ only that project's events.
 */
export function buildActivity(
  { projects = [], milestones = [], invoices = [], documents = [] }: Sources,
  { limit = 8, projectId = null }: { limit?: number; projectId?: string | null } = {}
): ActivityItem[] {
  const items: ActivityItem[] = [];
  const push = (i: ActivityItem | null) => {
    // A row with no date cannot be placed on a timeline, and guessing "now"
    // would float old records to the top.
    if (i?.at) items.push(i);
  };

  for (const p of projects) {
    push(
      p.start_date && {
        kind: "project.started",
        at: p.start_date,
        title: `${p.name} started`,
        projectId: p.id,
      }
    );
    push(
      p.delivered_at && {
        kind: "project.delivered",
        at: p.delivered_at,
        title: `${p.name} delivered`,
        projectId: p.id,
      }
    );
    push(
      p.staging_shared_at && {
        kind: "staging.shared",
        at: p.staging_shared_at,
        title: "Preview link shared",
        detail: p.name,
        projectId: p.id,
        href: p.staging_url ?? null,
      }
    );
  }

  for (const m of milestones) {
    push(
      m.completed_at && {
        kind: "milestone.completed",
        at: m.completed_at,
        title: `Milestone completed — ${m.title}`,
        projectId: m.project_id,
      }
    );
    // `client_approved` is a boolean with no timestamp of its own, so the
    // completion date is the only honest peg for it.
    push(
      m.client_approved && m.completed_at
        ? {
            kind: "milestone.approved",
            at: m.completed_at,
            title: `You approved — ${m.title}`,
            projectId: m.project_id,
          }
        : null
    );
  }

  for (const inv of invoices) {
    push(
      inv.issue_date && {
        kind: "invoice.issued",
        at: inv.issue_date,
        title: `Invoice ${inv.invoice_no ?? ""}`.trim(),
        detail: inv.status === "paid" ? "issued" : `due ${inv.due_date ?? "—"}`,
        projectId: inv.project_id ?? null,
      }
    );
    push(
      inv.paid_at && {
        kind: "invoice.paid",
        at: inv.paid_at,
        title: `Invoice ${inv.invoice_no ?? ""} paid`.trim(),
        projectId: inv.project_id ?? null,
      }
    );
  }

  for (const d of documents) {
    push(
      d.created_at && {
        kind: "document.shared",
        at: d.created_at,
        title: d.title,
        detail: "document shared",
        projectId: d.project_id ?? null,
      }
    );
  }

  const scoped = projectId ? items.filter((i) => i.projectId === projectId) : items;

  scoped.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  return limit > 0 ? scoped.slice(0, limit) : scoped;
}
