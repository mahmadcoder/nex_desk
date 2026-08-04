import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { moneyMulti, sumByCurrency, pdfFilename } from "@/lib/utils";
import { decryptCredentials } from "@/lib/crypto";
import { handoverGate } from "@/lib/delivery/gate";
import {
  AgreementDoc, QuotationDoc, InvoiceDoc, ReceiptDoc,
  ChangeOrderDoc, ProgressDoc, HandoverDoc,
} from "./documents";

export type DocType =
  | "agreement" | "quotation" | "invoice" | "receipt"
  | "change_order" | "progress_report" | "handover";


export async function generateDocument(type: DocType, id: string, actorId?: string) {
  const db = createAdminClient();
  let element: any;
  let title = "";
  let meta: Record<string, string | null> = {};
  let snapshot: any = {};

  if (type === "agreement" || type === "quotation") {
    const { data: deal } = await db.from("deals").select("*, clients(*)").eq("id", id).single();
    if (!deal) throw new Error("Deal not found");
    const client = deal.clients;
    // The cancellation policy is printed in the agreement so it is agreed at
    // signing rather than negotiated under pressure later.
    const { data: agreementSettings } = await db
      .from("settings").select("refund_policy").eq("id", 1).maybeSingle();
    title = `${type === "agreement" ? "Agreement" : "Quote"} ${deal.deal_no} — ${deal.title}`;
    meta = { client_id: client.id, deal_id: deal.id };
    snapshot = deal;
    element = createElement(
      type === "agreement" ? AgreementDoc : QuotationDoc,
      { deal, client, settings: agreementSettings }
    );
  }

  if (type === "invoice") {
    const { data: invoice } = await db.from("invoices").select("*, clients(*)").eq("id", id).single();
    if (!invoice) throw new Error("Invoice not found");
    const { data: settings } = await db.from("settings").select("bank_details").eq("id", 1).single();
    title = `Invoice ${invoice.invoice_no}`;
    meta = { client_id: invoice.client_id, invoice_id: invoice.id, project_id: invoice.project_id };
    snapshot = invoice;
    element = createElement(InvoiceDoc, { invoice, client: invoice.clients, bank: settings?.bank_details });
  }

  if (type === "receipt") {
    const { data: payment } = await db.from("payments").select("*, clients(*), invoices(*)").eq("id", id).single();
    if (!payment) throw new Error("Payment not found");
    title = `Receipt for ${payment.currency} ${payment.amount}`;
    meta = { client_id: payment.client_id, invoice_id: payment.invoice_id };
    snapshot = payment;
    element = createElement(ReceiptDoc, { payment, invoice: payment.invoices, client: payment.clients });
  }

  if (type === "progress_report") {
    const { data: project } = await db.from("projects").select("*, clients(*)").eq("id", id).single();
    if (!project) throw new Error("Project not found");
    const { data: milestones } = await db.from("milestones").select("*").eq("project_id", id).order("sort_order");
    title = `Progress report — ${project.name}`;
    meta = { client_id: project.client_id, project_id: project.id };
    snapshot = { project, milestones };
    element = createElement(ProgressDoc, { project, client: project.clients, milestones: milestones ?? [] });
  }

  if (type === "handover") {
    const { data: project } = await db
      .from("projects").select("*, clients(*), deals(total, currency)").eq("id", id).single();
    if (!project) throw new Error("Project not found");

    // Handover transfers ownership of the work, so it must not be produced
    // while money is outstanding. Enforced here, not just on the button — and
    // through the same shared gate the button uses, so the two can never
    // disagree about what "paid" means.
    //
    // Skipped once the project has actually been handed over: reprinting the
    // paperwork for a delivered project must not fail, and you cannot un-hand
    // something over by asking for another copy of the document.
    if (!project.handed_over_at) {
      const { reasons } = await handoverGate(id);
      if (reasons.length) {
        throw new Error(`Handover is locked. ${reasons.join(" ")}`);
      }
    }

    title = `Handover — ${project.name}`;
    meta = { client_id: project.client_id, project_id: project.id };
    snapshot = project;
    element = createElement(HandoverDoc, {
      project, client: project.clients,
      // Stored encrypted; decrypted only here, at the moment the client is
      // actually being handed ownership.
      credentials: decryptCredentials(project.credentials as any[]),
    });
  }

  if (type === "change_order") {
    // Reads `change_requests`. The original code queried `change_orders`, a
    // table that was never created in any migration — so this document type
    // has always thrown, despite the renderer and email template existing.
    const { data: change } = await db
      .from("change_requests")
      .select("*, projects(id, name, deal_id), clients(*)")
      .eq("id", id)
      .single();
    if (!change) throw new Error("Change request not found");

    const project = (change.projects as any) ?? null;
    const { data: deal } = project?.deal_id
      ? await db.from("deals").select("*").eq("id", project.deal_id).maybeSingle()
      : { data: null };

    // A project with no deal behind it still needs a document, so synthesise
    // the agreement fields the renderer expects rather than failing.
    const dealForDoc = deal ?? {
      deal_no: project?.name ? `PRJ-${String(project.id).slice(0, 6).toUpperCase()}` : "—",
      title: project?.name ?? "Project",
      deadline: null,
      currency: change.currency || "USD",
      tax_percent: 0,
      total: 0,
    };

    const amount = Number(change.quoted_amount ?? 0);
    const changeForDoc = {
      ...change,
      // `deals.total` is tax-inclusive, and a quoted change amount is the final
      // figure the client agreed — so it must not be taxed again here either.
      items: [{ item: change.title, qty: 1, price: amount }],
      subtotal: amount,
      total: amount,
      new_deadline: null,
    };

    title = `Change order — ${change.title}`;
    meta = { client_id: change.client_id, project_id: change.project_id, deal_id: deal?.id ?? null };
    snapshot = changeForDoc;
    element = createElement(ChangeOrderDoc, {
      change: changeForDoc,
      deal: { ...dealForDoc, tax_percent: 0 },
      client: change.clients,
    });
  }

  // documents.created_by is a FK to profiles(id). A staff member authenticated
  // purely via user_metadata may not have a profiles row, and a dangling id
  // would fail the insert with 23503 — record NULL instead.
  let createdBy: string | null = null;
  if (actorId) {
    const { data: actorProfile } = await db
      .from("profiles").select("id").eq("id", actorId).maybeSingle();
    createdBy = actorProfile?.id ?? null;
  }

  const buffer = await renderToBuffer(element);
  const path = `${meta.client_id}/${type}/${Date.now()}-${type}.pdf`;

  const { error: upErr } = await db.storage
    .from("documents")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;

  const { data: doc } = await db.from("documents").insert({
    type,
    title,
    storage_path: path,
    file_size: buffer.length,
    snapshot,
    created_by: createdBy,
    ...meta,
  }).select().single();

  // `download` sets Content-Disposition on the signed URL. Without it the
  // browser saves the storage key — "1738…-agreement.pdf" — so a downloaded
  // agreement had the right contents under a meaningless name.
  const { data: signed } = await db.storage
    .from("documents")
    .createSignedUrl(path, 60 * 60 * 24 * 30, { download: pdfFilename(title) });

  return { buffer, path, url: signed?.signedUrl ?? null, document: doc, title };
}
