import { createAdminClient } from "@/lib/supabase/server";
import { moneyMulti } from "@/lib/utils";
import { contractPosition, extrasPosition, type Position } from "@/lib/billing";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Everything standing between a project and its handover.
 *
 * This lived in three places — `actions/delivery.ts`, `pdf/generate.ts`, and
 * re-derived by hand on the project page — which is two places too many for a
 * rule that decides whether ownership of the work changes hands. All three now
 * call this.
 *
 * The gate is:
 *   1. the CONTRACT must be paid in full, and
 *   2. no approved change request may still be unpaid.
 *
 * The word "contract" is doing real work there. Every copy of this used to
 * measure `deal.total` against payments across ALL of the project's invoices,
 * so a client who paid a few hundred for domains and change work drove the
 * apparent contract balance down and unlocked handover on a project that was
 * still owed for. `contractPosition` counts only invoices that bill a stage of
 * the signed agreement.
 *
 * Unpaid EXTRAS are a warning, not a block. A £12 domain re-bill should not
 * hard-lock a £5,000 delivery — and the change-request gate above already
 * covers the extras that genuinely carry weight.
 */

export type HandoverGate = {
  project: any;
  deal: any | null;
  contract: Position;
  extras: Position;
  openChanges: any[];
  /** Hard blocks. Non-empty means handover must not proceed. */
  reasons: string[];
  /** Worth saying out loud, but not a block. */
  warnings: string[];
};

export async function handoverGate(projectId: string): Promise<HandoverGate> {
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("*, clients(id, name, email), deals(id, deal_no, total, currency, status, is_retainer)")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("Project not found.");

  // `deal_id` and `stage_index` are what tell a contract stage apart from a
  // change request or a re-billed cost, so both must be selected here.
  const { data: invoices } = await db
    .from("invoices")
    .select("id, total, amount_paid, currency, status, deal_id, stage_index")
    .eq("project_id", projectId);

  const deal = (project.deals as any) ?? null;
  const rows = invoices ?? [];

  // All of them: the agreed ones count towards the contract, and the
  // not-yet-invoiced ones are the only case the contract balance cannot see.
  const { data: changeRequests } = await db
    .from("change_requests")
    .select("id, title, quoted_amount, currency, status, invoice_id")
    .eq("project_id", projectId);

  // A deal with a zero total carries no agreed figure, so it falls through to
  // the invoice-based basis inside contractPosition rather than reporting
  // nothing owed — which would silently unlock the gate.
  const contract = contractPosition(
    deal && Number(deal.total) > 0 ? [{ ...deal, status: "locked" }] : [],
    rows,
    changeRequests ?? []
  );
  const extras = extrasPosition(rows, changeRequests ?? []);

  // Agreed but NOT yet invoiced. Once a change request is invoiced its unpaid
  // balance is already inside contract.outstanding above, so listing it here
  // as well would block the handover twice for one reason.
  const openChanges = (changeRequests ?? []).filter((c) =>
    ["quoted", "approved"].includes(String(c.status))
  );

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!deal && !rows.length) {
    reasons.push("Lock a deal, or raise and settle an invoice, before handing this project over.");
  }
  if (contract.outstanding.length) {
    reasons.push(`Outstanding on the agreement: ${moneyMulti(contract.outstanding)}.`);
  }
  if (openChanges?.length) {
    reasons.push(
      `${openChanges.length} agreed change request${openChanges.length === 1 ? "" : "s"} still to be invoiced.`
    );
  }

  if (extras.outstanding.length) {
    warnings.push(
      `${moneyMulti(extras.outstanding)} of additional items is still unpaid. ` +
      `This does not block handover — collect it before you lose the leverage.`
    );
  }

  return {
    project,
    deal,
    contract,
    extras,
    openChanges,
    reasons,
    warnings,
  };
}
