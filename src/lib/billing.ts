import { sumByCurrency } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Telling contract money apart from everything else.
 *
 * A client's invoices come from four different places, and only one of them
 * bills the signed agreement:
 *
 *   payment stage    deal_id SET   stage_index SET    ← the contract
 *   retainer renewal deal_id SET   stage_index NULL   ← recurring, not the contract
 *   change request   deal_id NULL  stage_index NULL   ← extra
 *   expense re-bill  deal_id NULL  stage_index NULL   ← extra
 *
 * Until this module existed, every page computed
 * `outstanding = deal.total − (paid across ALL invoices)`, so paying for a
 * domain reduced what the client appeared to owe on the agreement. That was
 * wrong on screen in five places — and in `handoverBlockers` it was worse than
 * cosmetic: paying enough extras drove the contract balance to zero and
 * unlocked handover on a project that was still owed for.
 *
 * Note what the safe test is NOT. `deal_id != null` alone would count retainer
 * renewals as contract payments, so month two of a monthly retainer would look
 * like the contract being paid twice over.
 *
 * Pure functions, no database, no `"use server"` — so server components, plain
 * modules (`lib/pdf/generate.ts`) and server actions can all share exactly one
 * definition of what "paid" means.
 */

export type Money = Array<{ currency: string; total: number }>;

export type Position = {
  /** The agreed figure. Only meaningful for the contract. */
  contracted: Money;
  /** Issued and sent — drafts excluded. */
  billed: Money;
  paid: Money;
  outstanding: Money;
};

const EMPTY: Position = { contracted: [], billed: [], paid: [], outstanding: [] };

/**
 * Does this invoice bill a stage of the signed agreement?
 *
 * `stage_index` is checked against null/undefined rather than for truthiness:
 * stage 0 is the advance — usually the single largest payment on the whole
 * deal — and `!inv.stage_index` would silently discard it.
 */
export function isContractInvoice(inv: any): boolean {
  return (
    inv?.deal_id !== null &&
    inv?.deal_id !== undefined &&
    inv?.stage_index !== null &&
    inv?.stage_index !== undefined
  );
}

/** True for a renewal on a recurring deal: attached to a deal, but not a stage. */
export function isRecurringInvoice(inv: any): boolean {
  return (
    inv?.deal_id !== null &&
    inv?.deal_id !== undefined &&
    (inv?.stage_index === null || inv?.stage_index === undefined)
  );
}

/**
 * Change-request statuses that represent work the client has actually agreed
 * to buy. `requested` and `quoted` are still conversations; `declined` is a no.
 *
 * `approved` is in the enum but `approveChangeRequest` writes `invoiced`
 * directly — it is accepted here anyway, so a status that exists cannot go
 * quietly uncounted if it ever starts being used.
 */
const AGREED_CR_STATUSES = new Set(["approved", "invoiced", "completed"]);

export function agreedChangeRequests(changeRequests: any[] = []) {
  return changeRequests.filter((c) => AGREED_CR_STATUSES.has(String(c?.status)));
}

/** The invoices raised by agreed change requests, so they can be recognised. */
export function changeRequestInvoiceIds(changeRequests: any[] = []): Set<string> {
  return new Set(
    agreedChangeRequests(changeRequests)
      .map((c) => c?.invoice_id)
      .filter(Boolean) as string[]
  );
}

/**
 * Sorts invoices by where they came from.
 *
 * A change-request invoice and a re-billed domain look identical by column —
 * both carry `deal_id` NULL and `stage_index` NULL — so the only way to tell
 * them apart is the link stored on `change_requests.invoice_id`. Pass those ids
 * in and a change request is treated as contract work, which is what it is:
 * extra scope the client agreed to buy. A re-billed cost is not, and stays an
 * extra.
 */
export function splitInvoices(invoices: any[] = [], crInvoiceIds?: Set<string>) {
  const contract: any[] = [];
  const recurring: any[] = [];
  const extras: any[] = [];

  for (const inv of invoices) {
    if (isContractInvoice(inv) || crInvoiceIds?.has(inv?.id)) contract.push(inv);
    else if (isRecurringInvoice(inv)) recurring.push(inv);
    else extras.push(inv);
  }

  return { contract, recurring, extras };
}

/** A draft is a scheduled stage nobody has been billed for yet. */
const issued = (rows: any[]) => rows.filter((i) => i.status !== "draft");

/**
 * Where a client stands against their signed agreements.
 *
 * `outstanding` is deliberately measured against `deals.total`, NOT against the
 * invoices raised so far: a 1500 deal billed 50/50 has only a 750 invoice on
 * day one, and measuring invoice-against-invoice once made the app declare that
 * client settled in full after their advance.
 *
 * Subtraction happens per currency code. A USD contract part-paid by a PKR
 * invoice stays fully outstanding in USD rather than being quietly netted off.
 */
export function contractPosition(
  deals: any[] = [],
  invoices: any[] = [],
  changeRequests: any[] = []
): Position {
  const locked = deals.filter((d) => d?.status === "locked");

  // Agreed extra work counts towards the contract, and its invoices count as
  // contract invoices. Both sides come from the SAME filtered list — take the
  // value from one set and the invoices from another and `outstanding` drifts
  // by exactly the difference.
  const agreedCRs = agreedChangeRequests(changeRequests);
  const { contract } = splitInvoices(invoices, changeRequestInvoiceIds(changeRequests));
  const sent = issued(contract);

  const contracted = sumByCurrency(
    [
      ...locked.map((d: any) => ({ currency: d.currency, value: Number(d.total) })),
      ...agreedCRs.map((c: any) => ({
        // A change request may be quoted in a different currency from the deal.
        currency: c.currency || "USD",
        value: Number(c.quoted_amount || 0),
      })),
    ],
    (r: any) => r.currency,
    (r: any) => r.value
  );
  const billed = sumByCurrency(sent, (i: any) => i.currency, (i: any) => Number(i.total));
  const paid = sumByCurrency(sent, (i: any) => i.currency, (i: any) => Number(i.amount_paid));

  // Typed explicitly: `new Map(arr.map(...))` infers a union key/value type
  // from the array literal rather than a tuple, and the subtraction below then
  // fails to typecheck.
  const paidBy = new Map<string, number>(paid.map((t) => [t.currency, t.total] as const));

  // With no locked deal there is no agreed figure to measure against, so fall
  // back to what was actually invoiced — the same fallback the pages used
  // before this module existed.
  const basis = contracted.length ? contracted : billed;

  const outstanding = basis
    .map((t) => ({ currency: t.currency, total: t.total - (paidBy.get(t.currency) ?? 0) }))
    .filter((t) => t.total > 0.009);

  return { contracted, billed, paid, outstanding };
}

/**
 * Everything that is not the contract: re-billed costs and retainer renewals.
 *
 * `changeRequests` must be passed the SAME list given to `contractPosition`.
 * Agreed change requests moved to the contract side, and leaving them here too
 * would count the same money twice — once as contract, once as an extra.
 *
 * Outstanding here is per invoice (`total − amount_paid`) because there is no
 * agreed total to measure against — each of these is its own small agreement.
 */
export function extrasPosition(invoices: any[] = [], changeRequests: any[] = []): Position {
  const { recurring, extras } = splitInvoices(
    invoices,
    changeRequestInvoiceIds(changeRequests)
  );
  const sent = issued([...recurring, ...extras]);

  const billed = sumByCurrency(sent, (i: any) => i.currency, (i: any) => Number(i.total));
  const paid = sumByCurrency(sent, (i: any) => i.currency, (i: any) => Number(i.amount_paid));
  const outstanding = sumByCurrency(
    sent,
    (i: any) => i.currency,
    (i: any) => Number(i.total) - Number(i.amount_paid)
  ).filter((t) => t.total > 0.009);

  return { contracted: [], billed, paid, outstanding };
}

/** Just the renewals, for the one place that shows them on their own. */
export function recurringPosition(invoices: any[] = []): Position {
  const { recurring } = splitInvoices(invoices);
  const sent = issued(recurring);

  return {
    contracted: [],
    billed: sumByCurrency(sent, (i: any) => i.currency, (i: any) => Number(i.total)),
    paid: sumByCurrency(sent, (i: any) => i.currency, (i: any) => Number(i.amount_paid)),
    outstanding: sumByCurrency(
      sent,
      (i: any) => i.currency,
      (i: any) => Number(i.total) - Number(i.amount_paid)
    ).filter((t) => t.total > 0.009),
  };
}

/**
 * Adds two per-currency lists together, matching on currency code.
 *
 * For the one honest question that spans both: "what do I owe you in total?"
 * Currencies are still never merged into each other.
 */
export function mergeTotals(a: Money = [], b: Money = []): Money {
  const out = new Map<string, number>();
  for (const t of [...a, ...b]) {
    const code = String(t.currency).toUpperCase();
    out.set(code, (out.get(code) ?? 0) + Number(t.total || 0));
  }
  return [...out.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .filter((t) => Math.abs(t.total) > 0.009)
    .sort((x, y) => y.total - x.total);
}

/** A short human tag for an invoice row, or null for an ordinary contract stage. */
export function invoiceOriginLabel(inv: any): string | null {
  if (isContractInvoice(inv)) return null;
  if (isRecurringInvoice(inv)) return "Renewal";
  return "Additional";
}

export { EMPTY as EMPTY_POSITION };
