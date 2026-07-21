import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
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
    title = `${type === "agreement" ? "Agreement" : "Quote"} ${deal.deal_no} — ${deal.title}`;
    meta = { client_id: client.id, deal_id: deal.id };
    snapshot = deal;
    element = createElement(type === "agreement" ? AgreementDoc : QuotationDoc, { deal, client });
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
    const { data: project } = await db.from("projects").select("*, clients(*)").eq("id", id).single();
    if (!project) throw new Error("Project not found");
    title = `Handover — ${project.name}`;
    meta = { client_id: project.client_id, project_id: project.id };
    snapshot = project;
    element = createElement(HandoverDoc, {
      project, client: project.clients,
      credentials: (project.credentials as any[]) ?? [],
    });
  }

  if (type === "change_order") {
    const { data: change } = await db.from("change_orders").select("*, deals(*, clients(*))").eq("id", id).single();
    if (!change) throw new Error("Change order not found");
    title = `Change order — ${change.title}`;
    meta = { client_id: change.deals.clients.id, deal_id: change.deal_id };
    snapshot = change;
    element = createElement(ChangeOrderDoc, { change, deal: change.deals, client: change.deals.clients });
  }

  const buffer = await renderToBuffer(element);
  const path = `${meta.client_id}/${type}/${Date.now()}-${type}.pdf`;

  const { error: upErr } = await db.storage
    .from("documents")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;

  const { data: doc } = await db.from("documents").insert({
    type: type === "agreement" ? "agreement" : type,
    title,
    storage_path: path,
    file_size: buffer.length,
    snapshot,
    created_by: actorId ?? null,
    ...meta,
  }).select().single();

  const { data: signed } = await db.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 30);

  return { buffer, path, url: signed?.signedUrl ?? null, document: doc, title };
}
