import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { s, C } from "./theme";
import { DocHeader, DocFooter, Field, fmt, date, docAgency } from "./parts";
import { CONTACT_EMAIL, CONTACT_WHATSAPP, getSiteBaseUrl } from "@/lib/utils";
import { warrantyTerms } from "@/lib/warranty";
import { agencyDay } from "@/lib/datetime";
import { SUB_PROCESSORS } from "@/config/subprocessors";
import { SECURITY_SECTIONS, SECURITY_PREAMBLE } from "@/config/security";
import { intakeFieldsFor, intakeTitleFor } from "@/config/intakeFields";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Party = {
  name: string; email: string; phone?: string; company?: string;
  address?: string; city?: string; country?: string; tax_id?: string;
};

const partyLines = (p: Party) =>
  [p.company, p.name, p.email, p.phone, p.address, [p.city, p.country].filter(Boolean).join(", "), p.tax_id && `Tax ID: ${p.tax_id}`]
    .filter(Boolean) as string[];

function Parties({ client, meta }: { client: Party; meta: [string, string][] }) {
  return (
    <View style={s.cols}>
      <View style={s.col}>
        <Text style={s.label}>Prepared for</Text>
        {partyLines(client).map((l, i) => (
          <Text key={i} style={i === 0 ? { fontWeight: 500 } : undefined}>{l}</Text>
        ))}
      </View>
      <View style={s.col}>
        <Text style={s.label}>Prepared by</Text>
        <Text style={{ fontWeight: 500 }}>{docAgency().name}</Text>
        <Text>{docAgency().email}</Text>
        <Text>{docAgency().location}</Text>
        {/* The client tax_id has always been printed here; the agency had no
            equivalent field, which is the number that makes an invoice
            deductible for the business receiving it. */}
        {!!docAgency().taxId && <Text>Tax ID: {docAgency().taxId}</Text>}
      </View>
      <View style={s.col}>
        {meta.map(([k, v]) => (
          <View key={k} style={{ marginBottom: 8 }}>
            <Text style={s.label}>{k}</Text>
            <Text>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LineItems({
  items, currency, subtotal, discount, taxPercent, total,
}: {
  items: { item: string; qty?: number; price: number; note?: string }[];
  currency: string; subtotal: number; discount: number; taxPercent: number; total: number;
}) {
  const tax = ((subtotal - discount) * taxPercent) / 100;
  return (
    <>
      <View style={s.table}>
        <View style={s.th}>
          <Text style={[s.thText, { flex: 5 }]}>Deliverable</Text>
          <Text style={[s.thText, { flex: 1, textAlign: "center" }]}>Qty</Text>
          <Text style={[s.thText, { flex: 1.6, textAlign: "right" }]}>Amount</Text>
        </View>
        {items.map((it, i) => (
          <View key={i} style={s.tr}>
            <View style={{ flex: 5 }}>
              <Text>{it.item}</Text>
              {it.note && <Text style={[s.muted, { fontSize: 9, marginTop: 2 }]}>{it.note}</Text>}
            </View>
            <Text style={{ flex: 1, textAlign: "center" }}>{it.qty ?? 1}</Text>
            <Text style={{ flex: 1.6, textAlign: "right" }}>{fmt(it.price, currency)}</Text>
          </View>
        ))}
      </View>

      <View style={s.totals}>
        <View style={s.totalRow}>
          <Text style={s.muted}>Subtotal</Text><Text>{fmt(subtotal, currency)}</Text>
        </View>
        {discount > 0 && (
          <View style={s.totalRow}>
            <Text style={s.muted}>Discount</Text><Text>− {fmt(discount, currency)}</Text>
          </View>
        )}
        {taxPercent > 0 && (
          <View style={s.totalRow}>
            <Text style={s.muted}>Tax ({taxPercent}%)</Text><Text>{fmt(tax, currency)}</Text>
          </View>
        )}
        <View style={s.grand}>
          <Text style={s.grandText}>Total</Text>
          <Text style={s.grandText}>{fmt(total, currency)}</Text>
        </View>
      </View>
    </>
  );
}

/* ============================================================
   1. AGREEMENT — the deal-locked document
   ============================================================ */
export function AgreementDoc({ deal, client, settings }: { deal: any; client: Party; settings?: any }) {
  const items = (deal.deliverables ?? []) as any[];
  const schedule = (deal.payment_schedule ?? []) as any[];

  return (
    <Document title={`Agreement ${deal.deal_no}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Project agreement" number={deal.deal_no} />

        <View style={{ marginTop: 26 }}>
          <View style={[s.row, { alignItems: "center" }]}>
            <Text style={s.h1}>{deal.title}</Text>
            <Text style={s.badge}>Locked</Text>
          </View>
          {deal.summary && <Text style={s.muted}>{deal.summary}</Text>}
        </View>

        <Parties
          client={client}
          meta={[
            ["Date locked", date(deal.locked_at)],
            ["Start date", date(deal.start_date)],
            ["Deadline", date(deal.deadline)],
          ]}
        />

        {deal.scope && (
          <>
            <Text style={s.h2}>1. Scope of work</Text>
            <Text style={{ lineHeight: 1.7 }}>{deal.scope}</Text>
          </>
        )}

        <Text style={s.h2}>2. Deliverables and price</Text>
        <LineItems
          items={items}
          currency={deal.currency}
          subtotal={Number(deal.subtotal)}
          discount={Number(deal.discount)}
          taxPercent={Number(deal.tax_percent)}
          total={Number(deal.total)}
        />

        {!!schedule.length && (
          <>
            <Text style={s.h2}>3. Payment schedule</Text>
            <View style={s.table}>
              <View style={s.th}>
                <Text style={[s.thText, { flex: 3 }]}>Stage</Text>
                <Text style={[s.thText, { flex: 1, textAlign: "center" }]}>Share</Text>
                <Text style={[s.thText, { flex: 2 }]}>Due</Text>
                <Text style={[s.thText, { flex: 2, textAlign: "right" }]}>Amount</Text>
              </View>
              {schedule.map((p, i) => (
                <View key={i} style={s.tr}>
                  <Text style={{ flex: 3 }}>{p.label}</Text>
                  <Text style={{ flex: 1, textAlign: "center" }}>{p.percent}%</Text>
                  <Text style={{ flex: 2 }}>{p.due_on ?? "On milestone"}</Text>
                  <Text style={{ flex: 2, textAlign: "right" }}>{fmt(p.amount, deal.currency)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={s.callout}>
          <Text style={{ fontWeight: 500, marginBottom: 4 }}>At a glance</Text>
          <Text>
            {fmt(Number(deal.total), deal.currency)} total · {deal.duration_days ?? "—"} working days ·{" "}
            {deal.revisions_included} revision rounds included · delivery by {date(deal.deadline)} ·{" "}
            {/* "0 days" reads like a bug, so a deal sold without support says so. */}
            {Number(deal.warranty_days ?? 14) > 0
              ? `${Number(deal.warranty_days ?? 14)} days support after handover`
              : "no support period included"}
          </Text>
        </View>

        {deal.exclusions && (
          <>
            <Text style={s.h2}>4. Not included</Text>
            <Text style={{ lineHeight: 1.7 }}>{deal.exclusions}</Text>
          </>
        )}

        <DocFooter number={deal.deal_no} />
      </Page>

      <Page size="A4" style={s.page}>
        <DocHeader type="Project agreement" number={deal.deal_no} />
        <Text style={s.h2}>5. Terms and conditions</Text>
        <Text style={s.terms}>{deal.terms}</Text>

        {/* What happens if this is called off. Agreed at signing rather than
            negotiated under pressure later. */}
        {settings?.refund_policy && (
          <>
            <Text style={s.h2}>6. If the project is cancelled</Text>
            <Text style={s.terms}>{settings.refund_policy}</Text>
          </>
        )}

        <Text style={s.h2}>{settings?.refund_policy ? "7" : "6"}. Acceptance</Text>
        <Text style={s.terms}>
          By approving this agreement in writing or by paying the advance invoice, both
          parties accept the scope, price, timeline and terms set out above. This document
          supersedes any prior verbal discussion.
        </Text>

        <View style={s.signRow}>
          <View style={s.signBox}>
            <Text style={s.label}>For the client</Text>
            {deal.accepted_signature ? (
              <Image src={deal.accepted_signature} style={{ height: 36, width: 120, objectFit: "contain", marginVertical: 4 }} />
            ) : null}
            <Text style={{ marginTop: deal.accepted_signature ? 4 : 12, fontWeight: 500 }}>
              {deal.accepted_name || deal.signature_name || client.name}
            </Text>
            <Text style={s.muted}>{client.company || client.email}</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>
              Date: {date(deal.accepted_at ?? deal.signature_date ?? deal.locked_at)}
            </Text>
            {deal.accepted_at && (
              <Text style={[s.muted, { marginTop: 4, fontSize: 9 }]}>
                Accepted electronically in the client portal by {deal.accepted_name || client.name}
              </Text>
            )}
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>For {docAgency().name}</Text>
            {docAgency().adminSignature ? (
              <Image src={docAgency().adminSignature!} style={{ height: 36, width: 120, objectFit: "contain", marginVertical: 4 }} />
            ) : null}
            <Text style={{ marginTop: docAgency().adminSignature ? 4 : 12, fontWeight: 500 }}>{docAgency().name}</Text>
            <Text style={s.muted}>{CONTACT_EMAIL}</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Date: {date(deal.locked_at)}</Text>
          </View>
        </View>

        {deal.accepted_at && (
          <View style={{ marginTop: 12, padding: 7, borderRadius: 4, backgroundColor: C.ink, border: `1px solid ${C.lime}` }}>
            <Text style={{ fontSize: 8, color: C.lime, fontWeight: 500 }}>
              VERIFIED ELECTRONIC SIGNATURE & LEGAL AUDIT TRAIL
            </Text>
            <Text style={{ fontSize: 7, color: C.bone, marginTop: 2 }}>
              Electronically signed by {deal.accepted_name || client.name} on {date(deal.accepted_at)}. Authenticated via Nex Desk Portal.
            </Text>
          </View>
        )}

        <DocFooter number={deal.deal_no} />
      </Page>
    </Document>
  );
}

/* ============================================================
   2. QUOTATION — before the deal is locked
   ============================================================ */
export function QuotationDoc({ deal, client }: { deal: any; client: Party }) {
  return (
    <Document title={`Quote ${deal.deal_no}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Quotation" number={deal.deal_no} />
        <View style={{ marginTop: 26 }}>
          <Text style={s.h1}>{deal.title}</Text>
          {deal.summary && <Text style={s.muted}>{deal.summary}</Text>}
        </View>

        <Parties
          client={client}
          meta={[
            ["Issued", date(deal.quote_sent_at ?? deal.created_at)],
            // The stored expiry, not "14 days from whenever this was rendered".
            // Computing it at render time meant re-opening a month-old quote
            // silently claimed another fortnight of validity.
            [
              "Valid until",
              date(
                deal.quote_expires_on ??
                  new Date(new Date(deal.created_at).getTime() + 14 * 864e5).toISOString()
              ),
            ],
            ["Est. duration", `${deal.duration_days ?? "—"} days`],
            [
              "Support after launch",
              Number(deal.warranty_days ?? 14) > 0 ? `${Number(deal.warranty_days ?? 14)} days` : "Not included",
            ],
          ]}
        />

        {deal.scope && (<><Text style={s.h2}>Scope</Text><Text style={{ lineHeight: 1.7 }}>{deal.scope}</Text></>)}

        <Text style={s.h2}>Price</Text>
        <LineItems
          items={deal.deliverables ?? []}
          currency={deal.currency}
          subtotal={Number(deal.subtotal)}
          discount={Number(deal.discount)}
          taxPercent={Number(deal.tax_percent)}
          total={Number(deal.total)}
        />

        <View style={s.callout}>
          <Text>
            {deal.quote_expires_on
              ? `This quote stands until ${date(deal.quote_expires_on)}. `
              : "This quote is valid for 14 days. "}
            Nothing is committed until you approve it in writing, at which point it becomes
            a signed agreement.
          </Text>
        </View>

        {deal.exclusions && (<><Text style={s.h2}>Not included</Text><Text>{deal.exclusions}</Text></>)}
        <DocFooter number={deal.deal_no} />
      </Page>
    </Document>
  );
}

/* ============================================================
   3. INVOICE
   ============================================================ */
export function InvoiceDoc({ invoice, client, bank }: { invoice: any; client: Party; bank?: any }) {
  const balance = Number(invoice.total) - Number(invoice.amount_paid);
  return (
    <Document title={`Invoice ${invoice.invoice_no}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Invoice" number={invoice.invoice_no} />

        <Parties
          client={client}
          meta={[
            ["Issued", date(invoice.issue_date)],
            ["Due", date(invoice.due_date)],
            ["Status", String(invoice.status).toUpperCase()],
          ]}
        />

        <Text style={s.h2}>Items</Text>
        <LineItems
          items={invoice.line_items ?? []}
          currency={invoice.currency}
          subtotal={Number(invoice.subtotal)}
          discount={Number(invoice.discount)}
          taxPercent={Number(invoice.tax_percent)}
          total={Number(invoice.total)}
        />

        {Number(invoice.amount_paid) > 0 && (
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.muted}>Already paid</Text>
              <Text style={{ color: C.ok }}>− {fmt(Number(invoice.amount_paid), invoice.currency)}</Text>
            </View>
            <View style={s.grand}>
              <Text style={s.grandText}>Balance due</Text>
              <Text style={s.grandText}>{fmt(balance, invoice.currency)}</Text>
            </View>
          </View>
        )}

        <Text style={s.h2}>How to pay</Text>
        <View style={s.callout}>
          {bank ? (
            Object.entries(bank).map(([k, v]) => (
              <Text key={k}>
                <Text style={s.muted}>{k}: </Text>{String(v)}
              </Text>
            ))
          ) : (
            <Text style={s.muted}>Bank details are set in admin under Settings.</Text>
          )}
          <Text style={{ marginTop: 8 }}>
            Send the payment screenshot to {CONTACT_EMAIL}, or on WhatsApp to{" "}
            {CONTACT_WHATSAPP} — whichever is easier. You get a receipt the same day.
          </Text>
        </View>

        {invoice.notes && (<><Text style={s.h2}>Notes</Text><Text style={s.terms}>{invoice.notes}</Text></>)}
        <DocFooter number={invoice.invoice_no} />
      </Page>
    </Document>
  );
}

/* ============================================================
   4. RECEIPT — proof of payment
   ============================================================ */
export function ReceiptDoc({ payment, invoice, client }: { payment: any; invoice: any; client: Party }) {
  const balance = Number(invoice?.total ?? 0) - Number(invoice?.amount_paid ?? 0);
  const no = `RCP-${String(payment.id).slice(0, 8).toUpperCase()}`;

  return (
    <Document title={`Receipt ${no}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Payment receipt" number={no} />

        {/* The amount inherits the page line-height (1.55). At 32px that box is
            ~50pt tall, and react-pdf lays the following line inside it — which
            is what printed the date on top of the figure. An explicit
            line-height on the large text, and real margins instead of a shared
            marginVertical, keep the three lines apart. */}
        <View style={{ marginTop: 30, alignItems: "center", paddingVertical: 24, paddingHorizontal: 20, borderWidth: 1, borderColor: C.line, borderRadius: 6, backgroundColor: "#F1EEE4" }}>
          <Text style={[s.label, { marginBottom: 10 }]}>Amount received</Text>
          <Text style={{ fontSize: 30, fontWeight: 500, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 10 }}>
            {fmt(Number(payment.amount), payment.currency)}
          </Text>
          <Text style={[s.muted, { lineHeight: 1.4 }]}>Received on {date(payment.paid_on)}</Text>
        </View>

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.label}>Received from</Text>
            {partyLines(client).map((l, i) => <Text key={i}>{l}</Text>)}
          </View>
          <View style={s.col}>
            <Field label="Payment method" value={String(payment.method).replace(/_/g, " ")} />
            <Field label="Reference / transaction ID" value={payment.reference} />
            <Field label="Recorded on" value={date(payment.created_at)} />
          </View>
          <View style={s.col}>
            <Field label="Against invoice" value={invoice?.invoice_no} />
            <Field label="Invoice total" value={invoice ? fmt(Number(invoice.total), invoice.currency) : undefined} />
            <Field label="Paid to date" value={invoice ? fmt(Number(invoice.amount_paid), invoice.currency) : undefined} />
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.row}>
          <Text style={{ fontWeight: 500, fontSize: 12 }}>
            {balance <= 0 ? "Paid in full" : "Remaining balance"}
          </Text>
          <Text style={{ fontWeight: 500, fontSize: 12, color: balance <= 0 ? C.ok : C.warn }}>
            {balance <= 0 ? "Nothing further due" : fmt(balance, invoice?.currency ?? payment.currency)}
          </Text>
        </View>

        {payment.note && (<><Text style={s.h2}>Note</Text><Text style={s.terms}>{payment.note}</Text></>)}

        <Text style={[s.terms, { marginTop: 26 }]}>
          This receipt is computer generated and valid without a signature. Keep it for your records.
        </Text>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

/* ============================================================
   5. CHANGE ORDER
   ============================================================ */
export function ChangeOrderDoc({ change, deal, client }: { change: any; deal: any; client: Party }) {
  const no = `CO-${deal.deal_no}-${change.index ?? 1}`;
  return (
    <Document title={`Change order ${no}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Change order" number={no} />

        <View style={{ marginTop: 26 }}>
          <Text style={s.h1}>{change.title}</Text>
          <Text style={s.muted}>Amends agreement {deal.deal_no} — {deal.title}</Text>
        </View>

        <Parties
          client={client}
          meta={[
            ["Raised", date(change.created_at)],
            ["Original deadline", date(deal.deadline)],
            ["Revised deadline", date(change.new_deadline)],
          ]}
        />

        <Text style={s.h2}>What is being added</Text>
        <Text style={{ lineHeight: 1.7 }}>{change.description}</Text>

        <Text style={s.h2}>Cost and time</Text>
        <LineItems
          items={change.items ?? []}
          currency={deal.currency}
          subtotal={Number(change.subtotal ?? 0)}
          discount={0}
          taxPercent={Number(deal.tax_percent ?? 0)}
          total={Number(change.total ?? 0)}
        />

        <View style={s.callout}>
          <Text style={{ fontWeight: 500, marginBottom: 4 }}>Effect on the project</Text>
          <Text>
            Additional cost {fmt(Number(change.total ?? 0), deal.currency)} · adds{" "}
            {change.extra_days ?? 0} working days · new contract total{" "}
            {fmt(Number(deal.total) + Number(change.total ?? 0), deal.currency)}
          </Text>
        </View>

        <Text style={s.h2}>Approval</Text>
        <Text style={s.terms}>
          All other terms of agreement {deal.deal_no} remain unchanged. Work on this change
          begins only after written approval. Reply &quot;approved&quot; to this email to accept.
        </Text>

        <View style={s.signRow}>
          <View style={s.signBox}>
            <Text style={s.label}>Approved by</Text>
            <Text style={{ marginTop: 12 }}>{client.name}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>Date</Text>
            <Text style={{ marginTop: 12 }}>&nbsp;</Text>
          </View>
        </View>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

/* ============================================================
   6. PROGRESS REPORT
   ============================================================ */
export function ProgressDoc({ project, client, milestones }: { project: any; client: Party; milestones: any[] }) {
  // agencyDay, not toISOString: a report run at 03:00 PKT is still today's
  // report, and a UTC stamp would name it with yesterday's date.
  const no = `PR-${String(project.id).slice(0, 6).toUpperCase()}-${agencyDay()}`;
  const done = milestones.filter((m) => m.is_done).length;

  return (
    <Document title={`Progress ${project.name}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Progress report" number={no} />

        <View style={{ marginTop: 26 }}>
          <Text style={s.h1}>{project.name}</Text>
          <Text style={s.muted}>Report generated {date(new Date().toISOString())}</Text>
        </View>

        <View style={{ marginTop: 22 }}>
          <View style={[s.row, { marginBottom: 6 }]}>
            <Text style={s.label}>Overall progress</Text>
            <Text style={{ fontWeight: 500 }}>{project.progress}%</Text>
          </View>
          <View style={{ height: 8, backgroundColor: "#E4E0D4", borderRadius: 4, overflow: "hidden" }}>
            <View style={{ height: 8, width: `${project.progress}%`, backgroundColor: C.lime }} />
          </View>
        </View>

        <Parties
          client={client}
          meta={[
            ["Status", String(project.status).replace(/_/g, " ")],
            ["Deadline", date(project.deadline)],
            ["Milestones", `${done} of ${milestones.length} done`],
          ]}
        />

        <Text style={s.h2}>Milestones</Text>
        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.thText, { flex: 5 }]}>Milestone</Text>
            <Text style={[s.thText, { flex: 2 }]}>Due</Text>
            <Text style={[s.thText, { flex: 2, textAlign: "right" }]}>Status</Text>
          </View>
          {milestones.map((m) => (
            <View key={m.id} style={s.tr}>
              <View style={{ flex: 5 }}>
                <Text>{m.title}</Text>
                {m.description && <Text style={[s.muted, { fontSize: 9 }]}>{m.description}</Text>}
              </View>
              <Text style={{ flex: 2 }}>{date(m.due_date)}</Text>
              <Text style={{ flex: 2, textAlign: "right", color: m.is_done ? C.ok : C.muted }}>
                {m.is_done ? "Done" : "In progress"}
              </Text>
            </View>
          ))}
        </View>

        {project.staging_url && (
          <View style={s.callout}>
            <Text style={{ fontWeight: 500, marginBottom: 3 }}>Review it live</Text>
            <Text>{project.staging_url}</Text>
          </View>
        )}

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

/* ============================================================
   7. HANDOVER CERTIFICATE
   ============================================================ */
export function HandoverDoc({ project, client, credentials }: { project: any; client: Party; credentials: any[] }) {
  const no = `HO-${String(project.id).slice(0, 6).toUpperCase()}`;
  const warranty = warrantyTerms(project);
  return (
    <Document title={`Handover ${project.name}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Handover certificate" number={no} />

        <View style={{ marginTop: 26 }}>
          <View style={[s.row, { alignItems: "center" }]}>
            <Text style={s.h1}>{project.name}</Text>
            <Text style={s.badge}>Delivered</Text>
          </View>
          <Text style={s.muted}>Handed over {date(project.delivered_at)}</Text>
        </View>

        <Parties
          client={client}
          meta={[
            ["Live URL", project.live_url ?? "—"],
            ["Delivered", date(project.delivered_at)],
            ["Support until", warranty.days > 0 ? date(warranty.endsOn) : "Not included"],
          ]}
        />

        <Text style={s.h2}>Ownership</Text>
        <Text style={{ lineHeight: 1.7 }}>
          On receipt of the final payment, full ownership of all source code, design files,
          content and accounts created for this project transfers to {client.company || client.name}.
          Nex Desk retains no licence or claim over them, and keeps only a copy for support purposes.
        </Text>

        {!!credentials?.length && (
          <>
            <Text style={s.h2}>Accounts and access</Text>
            <View style={s.table}>
              <View style={s.th}>
                <Text style={[s.thText, { flex: 2 }]}>Service</Text>
                <Text style={[s.thText, { flex: 3 }]}>Where</Text>
                <Text style={[s.thText, { flex: 3 }]}>Username</Text>
              </View>
              {credentials.map((c, i) => (
                <View key={i} style={s.tr}>
                  <Text style={{ flex: 2 }}>{c.service}</Text>
                  <Text style={{ flex: 3 }}>{c.url}</Text>
                  <Text style={{ flex: 3 }}>{c.username}</Text>
                </View>
              ))}
            </View>
            <Text style={[s.terms, { marginTop: 8 }]}>
              Passwords are sent separately over an encrypted channel, never in this document.
              Change all of them once you have received them.
            </Text>
          </>
        )}

        <Text style={s.h2}>Warranty and support</Text>
        {/* A deal sold with no support period says so, rather than printing
            "free of charge for 0 days", which reads as a bug. */}
        {warranty.days > 0 ? (
        <Text style={s.terms}>
          Bugs in the delivered scope are fixed free of charge for {warranty.days} days from
          the handover date above. This does not cover new features, third-party service
          outages, changes made by others to the codebase, or content updates. A monthly
          retainer covering updates, backups, monitoring and change hours is available on
          request.
        </Text>
        ) : (
          <Text style={s.terms}>
            This project was agreed without a support period, so no free defect-fix window
            applies. Anything you find from here is quoted first, so you know the cost before
            work starts. A monthly retainer covering updates, backups, monitoring and change
            hours is available on request.
          </Text>
        )}

        <View style={s.signRow}>
          <View style={s.signBox}>
            <Text style={s.label}>Received by</Text>
            <Text style={{ marginTop: 12 }}>{client.name}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>Delivered by</Text>
            <Text style={{ marginTop: 12 }}>{docAgency().name}</Text>
          </View>
        </View>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

/* ============================================================
   7. STAFF OFFER LETTER — issued when someone is hired
   ============================================================ */

/**
 * The standing terms every offer letter carries. Kept here, in one place, so
 * the wording is identical for every hire and can be revised in a single edit.
 */
const OFFER_TERMS = {
  hours:
    "Standard working hours are Monday to Saturday. Sunday is an official agency rest day — " +
    "work is not expected and any Sunday hours logged are voluntary. Hours are flexible around " +
    "agreed client meetings and delivery deadlines; what matters is that committed work lands on time.",
  logging:
    "Work is recorded daily in the Nex Desk control panel under Daily Work Logs: what you completed, " +
    "hours spent, and anything blocking you. This log is how progress reaches the client, how your " +
    "delivery record is kept, and how your review is evidenced. It is a condition of employment.",
  confidentiality:
    "You will have access to client source code, credentials, commercial terms and internal material. " +
    "All of it is confidential. You may not copy, share, publish or reuse it outside the work assigned " +
    "to you, during your employment or after it ends. Client credentials may not be stored outside the " +
    "systems the agency provides.",
  ip:
    "All work you produce in the course of your employment — code, designs, copy, documentation and " +
    "any derivative of it — is the property of Nex Desk and, on delivery, of the client it was produced " +
    "for. You retain no licence to it. You may reference the work in a personal portfolio only with " +
    "written permission from the agency.",
  conduct:
    "You are expected to communicate directly with the team about anything that will slip, hold client " +
    "data to the same standard you would hold your own, and never contract with an agency client " +
    "directly for work of the kind the agency provides while employed and for six months afterwards.",
  notice:
    "Either party may end this engagement with thirty (30) days' written notice. The agency may end it " +
    "immediately for a breach of confidentiality, intellectual property or client-conduct terms. On the " +
    "final day you will hand back all agency and client access, devices and material.",
  probation:
    "The first ninety (90) days are a mutual probation period, during which either party may end the " +
    "engagement with seven (7) days' written notice. Compensation is unchanged during probation.",
};

export function StaffOfferLetterDoc({ employee }: { employee: any }) {
  const no = `OL-${String(employee.id).slice(0, 8).toUpperCase()}`;
  const salary = Number(employee.salary_amount ?? 0);
  const currency = String(employee.salary_currency || "USD");
  const employmentType = String(employee.employment_type || "Full-Time");
  const location = [employee.city, employee.country].filter(Boolean).join(", ") || "Remote";
  const skills: string[] = Array.isArray(employee.skills) ? employee.skills : [];

  return (
    <Document title={`Offer letter — ${employee.full_name}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Offer of employment" number={no} />

        <View style={{ marginTop: 26 }}>
          <View style={[s.row, { alignItems: "center" }]}>
            <Text style={s.h1}>{employee.full_name}</Text>
            <Text style={s.badge}>{employmentType}</Text>
          </View>
          <Text style={s.muted}>
            {employee.job_title}
            {employee.seniority ? ` · ${employee.seniority}` : ""}
          </Text>
        </View>

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.label}>Issued to</Text>
            <Text style={{ fontWeight: 500 }}>{employee.full_name}</Text>
            <Text>{employee.email}</Text>
            {employee.phone && <Text>{employee.phone}</Text>}
            <Text>{location}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Issued by</Text>
            <Text style={{ fontWeight: 500 }}>{docAgency().name}</Text>
            <Text>{CONTACT_EMAIL}</Text>
            <Text>{docAgency().location}</Text>
          </View>
          <View style={s.col}>
            <View style={{ marginBottom: 8 }}>
              <Text style={s.label}>Start date</Text>
              <Text>{date(employee.joining_date)}</Text>
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={s.label}>Date of issue</Text>
              <Text>{date(new Date().toISOString())}</Text>
            </View>
          </View>
        </View>

        <Text style={s.h2}>1. The offer</Text>
        <Text style={{ lineHeight: 1.7 }}>
          Nex Desk is pleased to offer you the position of {employee.job_title} on a{" "}
          {employmentType.toLowerCase()} basis, starting {date(employee.joining_date)}. This letter sets
          out the position, what you will be paid, and the terms that apply. It takes effect when you
          accept it in writing.
        </Text>

        <Text style={s.h2}>2. Position and compensation</Text>
        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.thText, { flex: 2.6 }]}>Item</Text>
            <Text style={[s.thText, { flex: 3.4, textAlign: "right" }]}>Detail</Text>
          </View>
          {([
            ["Job title", String(employee.job_title ?? "—")],
            ["Seniority", String(employee.seniority ?? "—")],
            ["Employment type", employmentType],
            ["Work location", location],
            ["Start date", date(employee.joining_date)],
            [
              "Compensation",
              salary > 0 ? `${fmt(salary, currency)} per month (gross)` : "As agreed separately in writing",
            ],
            ["Pay cycle", "Monthly, within the first five working days of the following month"],
            ["Reporting to", "Agency management, through the Nex Desk control panel"],
          ] as [string, string][]).map(([k, v]) => (
            <View key={k} style={s.tr}>
              <Text style={{ flex: 2.6 }}>{k}</Text>
              <Text style={{ flex: 3.4, textAlign: "right" }}>{v}</Text>
            </View>
          ))}
        </View>

        {!!skills.length && (
          <>
            <Text style={s.h2}>3. What you are being hired for</Text>
            <Text style={{ lineHeight: 1.7 }}>
              You are joining to work on client delivery in the following areas: {skills.join(", ")}.
              Client assignments are made by agency management and appear in your control-panel
              dashboard.
            </Text>
          </>
        )}

        <Text style={s.h2}>{skills.length ? "4" : "3"}. Working hours</Text>
        <Text style={{ lineHeight: 1.7 }}>{OFFER_TERMS.hours}</Text>

        <Text style={s.h2}>{skills.length ? "5" : "4"}. Reporting your work</Text>
        <Text style={{ lineHeight: 1.7 }}>{OFFER_TERMS.logging}</Text>

        <View style={s.callout}>
          <Text style={{ fontWeight: 500, marginBottom: 4 }}>At a glance</Text>
          <Text>
            {employee.job_title} · {employmentType} ·{" "}
            {salary > 0 ? `${fmt(salary, currency)} per month` : "compensation as agreed"} · starting{" "}
            {date(employee.joining_date)} · {location}
          </Text>
        </View>

        <DocFooter number={no} />
      </Page>

      <Page size="A4" style={s.page}>
        <DocHeader type="Offer of employment" number={no} />

        <Text style={s.h2}>Probation</Text>
        <Text style={s.terms}>{OFFER_TERMS.probation}</Text>

        <Text style={s.h2}>Confidentiality</Text>
        <Text style={s.terms}>{OFFER_TERMS.confidentiality}</Text>

        <Text style={s.h2}>Intellectual property</Text>
        <Text style={s.terms}>{OFFER_TERMS.ip}</Text>

        <Text style={s.h2}>Conduct and client relationships</Text>
        <Text style={s.terms}>{OFFER_TERMS.conduct}</Text>

        <Text style={s.h2}>Notice and termination</Text>
        <Text style={s.terms}>{OFFER_TERMS.notice}</Text>

        <Text style={s.h2}>Acceptance</Text>
        <Text style={s.terms}>
          Please confirm your acceptance by signing below and returning a copy to {CONTACT_EMAIL}, or by
          replying to the email this letter arrived with. Starting work on the agreed date is also taken
          as acceptance of these terms.
        </Text>

        <View style={s.signRow}>
          <View style={s.signBox}>
            <Text style={s.label}>Accepted by</Text>
            <Text style={{ marginTop: 12, fontWeight: 500 }}>{employee.full_name}</Text>
            <Text style={s.muted}>{employee.email}</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Date: ____________________</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>For {docAgency().name}</Text>
            <Text style={{ marginTop: 12, fontWeight: 500 }}>{docAgency().name}</Text>
            <Text style={s.muted}>{CONTACT_EMAIL}</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Date: {date(new Date().toISOString())}</Text>
          </View>
        </View>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

export function AgencyTemplatePdfDocument({
  title,
  badge,
  content,
}: {
  title: string;
  badge: string;
  content: string;
}) {
  const no = `ND-TMPL-${Date.now().toString().slice(-4)}`;
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <Document title={title} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type={badge || "AGENCY DOCUMENT"} number={no} />

        <View style={{ marginTop: 8, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 6 }}>
          <Text style={[s.h1, { fontSize: 20, color: C.ink }]}>{title.toUpperCase()}</Text>
          <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            {docAgency().name} · {getSiteBaseUrl().replace(/^https?:\/\//, "")} · {docAgency().email} ·{" "}
            {docAgency().location}
          </Text>
        </View>

        <View style={{ marginBottom: 16 }}>
          {lines.map((line, idx) => {
            if (line.startsWith("===") || line.startsWith("---")) return null;
            if (
              line.toLowerCase().startsWith("nex desk — master") ||
              line.toLowerCase().startsWith("master software services") ||
              line.toLowerCase().startsWith("certificate of project completion") ||
              line.toLowerCase().startsWith("mutual non-disclosure agreement") ||
              line.toLowerCase().startsWith("statement of work") ||
              line.toLowerCase().startsWith("project handover") ||
              line.toLowerCase().startsWith("scope change order")
            ) {
              return null;
            }

            const isHeading =
              line.endsWith(":") ||
              /^[0-9]+\./.test(line) ||
              (line === line.toUpperCase() && line.length < 45);

            if (isHeading) {
              return (
                <Text key={idx} style={[s.h2, { fontSize: 13.5, marginTop: 18, marginBottom: 6, color: C.ink }]} wrap={false}>
                  {line}
                </Text>
              );
            }
            return (
              <Text key={idx} style={{ fontSize: 10.5, lineHeight: 1.65, color: C.ink, marginBottom: 4 }}>
                {line}
              </Text>
            );
          })}
        </View>

        <View style={[s.signRow, { marginTop: 16 }]} wrap={false}>
          <View style={s.signBox}>
            <Text style={s.label}>Authorized Representative</Text>
            <Text style={{ marginTop: 8, fontSize: 10.5, color: C.ink }}>{docAgency().name}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>Client Acceptance & Sign-Off</Text>
            <Text style={{ marginTop: 8, fontSize: 10.5, color: C.ink }}>Client Organization</Text>
          </View>
        </View>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}


/**
 * A payslip for one recorded salary payment.
 *
 * Net is computed here from base + bonus − deductions rather than read from a
 * stored total: a bonus corrected after the fact must change the payslip, and a
 * denormalised net is exactly the field that would be left behind.
 *
 * Every line carries its reason. A deduction with no explanation on the slip is
 * how trust in payroll evaporates.
 */
export function PayslipDoc({
  payment,
  employee,
}: {
  payment: any;
  employee: any;
}) {
  const no = `PS-${String(payment.id).slice(0, 8).toUpperCase()}`;
  const currency = String(payment.currency || employee.salary_currency || "USD");

  const base = Number(payment.amount ?? 0);
  const bonus = Number(payment.bonus ?? 0);
  const deductions = Number(payment.deductions ?? 0);
  const net = base + bonus - deductions;

  const period = new Date(payment.period_month).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const lines: [string, string, string][] = [
    ["Base salary", "Agreed monthly pay", fmt(base, currency)],
  ];
  if (bonus > 0) {
    lines.push(["Bonus", String(payment.bonus_note || "Discretionary"), `+ ${fmt(bonus, currency)}`]);
  }
  if (deductions > 0) {
    lines.push([
      "Deductions",
      String(payment.deduction_note || "As agreed"),
      `− ${fmt(deductions, currency)}`,
    ]);
  }

  return (
    <Document title={`Payslip — ${employee.full_name} — ${period}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Payslip" number={no} />

        <View style={{ marginTop: 26 }}>
          <View style={[s.row, { alignItems: "center" }]}>
            <Text style={s.h1}>{period}</Text>
            <Text style={s.badge}>{String(employee.employment_type || "Full-Time")}</Text>
          </View>
          <Text style={s.muted}>
            {employee.full_name}
            {employee.job_title ? ` · ${employee.job_title}` : ""}
          </Text>
        </View>

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.label}>Paid to</Text>
            <Text style={{ fontWeight: 500 }}>{employee.full_name}</Text>
            <Text>{employee.email}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Paid by</Text>
            <Text style={{ fontWeight: 500 }}>{docAgency().name}</Text>
            <Text>{docAgency().location}</Text>
          </View>
          <View style={s.col}>
            <View style={{ marginBottom: 8 }}>
              <Text style={s.label}>Paid on</Text>
              <Text>{date(payment.paid_on)}</Text>
            </View>
            <View>
              <Text style={s.label}>Method</Text>
              <Text>{String(payment.method || "bank transfer").replace(/_/g, " ")}</Text>
            </View>
          </View>
        </View>

        <Text style={s.h2}>Breakdown</Text>
        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.thText, { flex: 2 }]}>Item</Text>
            <Text style={[s.thText, { flex: 3 }]}>Detail</Text>
            <Text style={[s.thText, { flex: 1.6, textAlign: "right" }]}>Amount</Text>
          </View>
          {lines.map(([k, detail, amount]) => (
            <View key={k} style={s.tr}>
              <Text style={{ flex: 2 }}>{k}</Text>
              <Text style={[{ flex: 3 }, s.muted]}>{detail}</Text>
              <Text style={{ flex: 1.6, textAlign: "right" }}>{amount}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Gross</Text>
            <Text>{fmt(base + bonus, currency)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.muted}>Deductions</Text>
            <Text>{deductions > 0 ? `− ${fmt(deductions, currency)}` : fmt(0, currency)}</Text>
          </View>
          <View style={s.grand}>
            <Text style={s.grandText}>Net paid</Text>
            <Text style={s.grandText}>{fmt(net, currency)}</Text>
          </View>
        </View>

        {payment.reference && (
          <>
            <Text style={[s.label, { marginTop: 22 }]}>Reference</Text>
            <Text>{payment.reference}</Text>
          </>
        )}

        {payment.note && (
          <>
            <Text style={[s.label, { marginTop: 14 }]}>Note</Text>
            <Text style={{ lineHeight: 1.7 }}>{payment.note}</Text>
          </>
        )}

        <View style={s.callout}>
          <Text style={{ fontWeight: 500, marginBottom: 4 }}>Anything wrong?</Text>
          <Text>
            Tell us within 30 days and we will correct it on the next run. This payslip is
            generated from the payment record, so a correction there reissues this document.
          </Text>
        </View>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

/**
 * A mutual non-disclosure agreement.
 *
 * Deliberately short and mutual. A one-sided NDA that only binds the client is
 * the kind of thing a lawyer strikes out and a founder resents, and this is
 * usually signed before there is any relationship to spend goodwill from.
 *
 * The terms are FIXED here, not generated — an LLM inventing confidentiality
 * clauses for a document people actually sign is a liability, not a feature.
 */
export function NdaDoc({ client }: { client: any }) {
  const no = `NDA-${String(client.id).slice(0, 8).toUpperCase()}`;
  const today = date(new Date().toISOString());
  const them = client.company?.trim() || client.name;

  return (
    <Document title={`Mutual NDA — ${them}`} author="Nex Desk">
      <Page size="A4" style={s.page}>
        <DocHeader type="Mutual non-disclosure" number={no} />

        <View style={{ marginTop: 26 }}>
          <Text style={s.h1}>Mutual non-disclosure agreement</Text>
          <Text style={s.muted}>
            Between {docAgency().name} and {them}, dated {today}.
          </Text>
        </View>

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.label}>Party A</Text>
            <Text style={{ fontWeight: 500 }}>{docAgency().name}</Text>
            <Text>{CONTACT_EMAIL}</Text>
            <Text>{docAgency().location}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Party B</Text>
            <Text style={{ fontWeight: 500 }}>{them}</Text>
            {client.email && <Text>{client.email}</Text>}
            {[client.city, client.country].filter(Boolean).length > 0 && (
              <Text>{[client.city, client.country].filter(Boolean).join(", ")}</Text>
            )}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Date</Text>
            <Text>{today}</Text>
          </View>
        </View>

        <Text style={s.h2}>1. What this covers</Text>
        <Text style={{ lineHeight: 1.7 }}>
          Each party may share information the other would not otherwise have — designs, code,
          pricing, customer lists, business plans, credentials, or anything clearly marked
          confidential. This agreement covers that information in both directions equally.
        </Text>

        <Text style={s.h2}>2. What each party agrees</Text>
        <Text style={{ lineHeight: 1.7 }}>
          To use the other&apos;s confidential information only for the purpose of working
          together; not to share it with anyone outside their own team without written
          permission; and to protect it with at least the same care they apply to their own
          confidential information.
        </Text>

        <Text style={s.h2}>3. What this does not cover</Text>
        <Text style={{ lineHeight: 1.7 }}>
          Information that is already public, was already known before it was shared, is
          received independently from someone entitled to share it, or is developed
          independently without using the other party&apos;s information. Nor does it prevent a
          disclosure required by law or a court — in which case the disclosing party will say so
          in advance where it is lawful to do.
        </Text>

        <Text style={s.h2}>4. How long it lasts</Text>
        <Text style={{ lineHeight: 1.7 }}>
          Three years from the date above, or for as long as the information stays confidential,
          whichever ends first. Either party may end the discussions at any time; the obligations
          in section 2 survive.
        </Text>

        <Text style={s.h2}>5. Returning things</Text>
        <Text style={{ lineHeight: 1.7 }}>
          On request, each party will return or delete the other&apos;s confidential information,
          apart from copies held automatically in backups and anything a party must keep by law.
        </Text>

        <Text style={s.h2}>6. What this is not</Text>
        <Text style={{ lineHeight: 1.7 }}>
          This is not a contract to do work, an exclusivity arrangement, or a transfer of
          ownership. Nothing here obliges either party to enter any further agreement, and
          nothing in it grants a licence to the other&apos;s intellectual property.
        </Text>

        <View style={s.callout}>
          <Text style={{ fontWeight: 500, marginBottom: 4 }}>In short</Text>
          <Text>
            Both sides keep the other&apos;s private information private, for three years, and
            neither side is committed to anything beyond that.
          </Text>
        </View>

        <View style={[s.cols, { marginTop: 30 }]}>
          <View style={s.col}>
            <Text style={s.label}>Signed for {docAgency().name}</Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: C.line, marginTop: 26 }} />
            <Text style={[s.muted, { marginTop: 4 }]}>Name, signature and date</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Signed for {them}</Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: C.line, marginTop: 26 }} />
            <Text style={[s.muted, { marginTop: 4 }]}>Name, signature and date</Text>
          </View>
        </View>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

/* ============================================================
   SUB-PROCESSORS — shared by the DPA and the security document
   ============================================================ */

/**
 * One table, two documents.
 *
 * Both read `config/subprocessors.ts`, so the list a client sees in the DPA and
 * the list on the security page cannot drift apart. That matters more than it
 * looks: a DPA naming a service you dropped is a false written statement.
 */
function SubProcessorTable() {
  return (
    <View style={s.table}>
      <View style={s.th}>
        <Text style={[s.thText, { flex: 1.1 }]}>Service</Text>
        <Text style={[s.thText, { flex: 2.2 }]}>What it does</Text>
        <Text style={[s.thText, { flex: 1.4 }]}>Where</Text>
      </View>
      {SUB_PROCESSORS.map((p) => (
        <View key={p.name} style={s.tr} wrap={false}>
          <View style={{ flex: 1.1, paddingRight: 6 }}>
            <Text style={{ fontWeight: 500 }}>{p.name}</Text>
            {!p.handlesPersonalData && (
              <Text style={[s.muted, { fontSize: 8.5 }]}>no personal data</Text>
            )}
          </View>
          <Text style={{ flex: 2.2, paddingRight: 6 }}>{p.purpose}</Text>
          <Text style={[s.muted, { flex: 1.4 }]}>{p.location}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * A data processing agreement.
 *
 * The document a cautious buyer asks for before signing anything. Building
 * their software means we can see their customers' personal data: they are the
 * controller, we are the processor, and Article 28 of the GDPR requires that
 * arrangement to be in writing with specific terms in it.
 *
 * Like the NDA, the clauses are FIXED. Nothing here is generated — a model
 * inventing a breach-notification window for a document somebody signs is a
 * liability, not a feature.
 */
export function DpaDoc({ client }: { client: any }) {
  const no = `DPA-${String(client.id).slice(0, 8).toUpperCase()}`;
  const today = date(new Date().toISOString());
  const them = client.company?.trim() || client.name;
  const us = docAgency().name;

  return (
    <Document title={`Data Processing Agreement — ${them}`} author={us}>
      <Page size="A4" style={s.page}>
        <DocHeader type="Data processing" number={no} />

        <View style={{ marginTop: 26 }}>
          <Text style={s.h1}>Data processing agreement</Text>
          <Text style={s.muted}>
            Between {them} (the controller) and {us} (the processor), dated {today}. This
            supplements our services agreement and does not replace it.
          </Text>
        </View>

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.label}>Controller</Text>
            <Text style={{ fontWeight: 500 }}>{them}</Text>
            {client.email && <Text>{client.email}</Text>}
            {[client.city, client.country].filter(Boolean).length > 0 && (
              <Text>{[client.city, client.country].filter(Boolean).join(", ")}</Text>
            )}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Processor</Text>
            <Text style={{ fontWeight: 500 }}>{us}</Text>
            <Text>{docAgency().email}</Text>
            <Text>{docAgency().location}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Date</Text>
            <Text>{today}</Text>
          </View>
        </View>

        <Text style={s.h2}>1. Who decides what</Text>
        <Text style={s.terms}>
          {them} decides what personal data is collected and why — it is the controller. {us}{" "}
          processes that data only to deliver the services described in our agreement, and only
          on {them}&apos;s documented instructions. Where the law requires us to process
          something anyway, we will say so before we do unless the law forbids telling you.
        </Text>

        <Text style={s.h2}>2. What we process, and for how long</Text>
        <Text style={s.terms}>
          Subject matter: building, hosting support and maintenance of the software described in
          our agreement. The categories of data subject and of personal data are determined by
          {" "}{them}&apos;s own product — typically its customers, users and staff, and typically
          names, contact details, account records and whatever else the product stores. We hold
          it for as long as the engagement runs, plus the period in section 8.
        </Text>

        <Text style={s.h2}>3. Confidentiality</Text>
        <Text style={s.terms}>
          Everyone we allow near this data is bound to confidentiality, and access is limited to
          the people who need it to do the work. Access is role-based and enforced in the system
          itself, not by convention.
        </Text>

        <Text style={s.h2}>4. Security</Text>
        <Text style={s.terms}>
          We keep appropriate technical and organisational measures in place — encryption in
          transit and at rest, role-based access, an append-only audit log, and private file
          storage. Our security overview describes them, is available at {getSiteBaseUrl()}
          /security, and forms part of this agreement as the description of those measures.
        </Text>

        <Text style={s.h2}>5. Sub-processors</Text>
        <Text style={s.terms}>
          {them} gives general authorisation for the services listed below. We remain responsible
          for what they do with the data. We will give reasonable notice before adding or
          replacing one, and {them} may object on reasonable data-protection grounds.
        </Text>
        <SubProcessorTable />

        <Text style={s.h2}>6. Helping you meet your obligations</Text>
        <Text style={s.terms}>
          If one of {them}&apos;s users asks for access, correction, deletion or a copy of their
          data, we will help you answer within the time the law gives you. We will also help with
          impact assessments and with regulator enquiries about data we process for you. We do
          not respond to a data subject directly unless you ask us to.
        </Text>

        <Text style={s.h2}>7. If there is a breach</Text>
        <Text style={s.terms}>
          We will tell {them} without undue delay, and in any case within 72 hours of becoming
          aware of a personal data breach affecting your data — with what we know at that point,
          rather than waiting until we know everything. We contain first, then report, then
          follow up in writing.
        </Text>

        <Text style={s.h2}>8. Return and deletion</Text>
        <Text style={s.terms}>
          When the engagement ends, {them} chooses: we return the data in a usable format, or we
          delete it. Either happens within 30 days of the request. Copies inside automated
          backups are removed as those backups age out on their normal schedule, and stay
          protected by this agreement until they do. We keep only what the law requires.
        </Text>

        <Text style={s.h2}>9. Audit</Text>
        <Text style={s.terms}>
          {them} may ask us to demonstrate compliance with this agreement. We will answer
          questionnaires and provide the information needed, and will accommodate an audit once a
          year on reasonable notice at {them}&apos;s cost — or more often if a regulator requires
          it, or following a breach.
        </Text>

        <Text style={s.h2}>10. International transfers</Text>
        <Text style={s.terms}>
          Some services in section 5 process data outside the country it was collected in. Where
          that happens we rely on the transfer mechanism the provider offers — standard
          contractual clauses or an adequacy decision. If {them} needs data kept in a specific
          region, tell us before the project starts: it is a configuration decision that is
          simple at the beginning and expensive later.
        </Text>

        <View style={s.callout}>
          <Text style={{ fontWeight: 500, marginBottom: 4 }}>In short</Text>
          <Text>
            Your data stays yours. We use it only to do the work you asked for, keep it secure,
            name everyone who touches it, tell you within 72 hours if anything goes wrong, and
            give it back or delete it when you say so.
          </Text>
        </View>

        <View style={[s.cols, { marginTop: 30 }]}>
          <View style={s.col}>
            <Text style={s.label}>Signed for {us}</Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: C.line, marginTop: 26 }} />
            <Text style={[s.muted, { marginTop: 4 }]}>Name, signature and date</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Signed for {them}</Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: C.line, marginTop: 26 }} />
            <Text style={[s.muted, { marginTop: 4 }]}>Name, signature and date</Text>
          </View>
        </View>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

/**
 * The security overview.
 *
 * What gets attached when a client's procurement team sends a security
 * questionnaire. The content comes entirely from `config/security.ts` — the
 * same source as the public `/security` page, so a questionnaire answer cannot
 * quietly claim something the website does not.
 */
export function SecurityDoc({ client }: { client?: any }) {
  const today = date(new Date().toISOString());
  const no = `SEC-${agencyDay().replace(/-/g, "").slice(2)}`;
  const them = client ? client.company?.trim() || client.name : null;

  return (
    <Document title={`Security overview — ${docAgency().name}`} author={docAgency().name}>
      <Page size="A4" style={s.page}>
        <DocHeader type="Security overview" number={no} />

        <View style={{ marginTop: 26 }}>
          <Text style={s.h1}>How we protect your data</Text>
          <Text style={s.muted}>
            {docAgency().name} · {today}
            {them ? ` · prepared for ${them}` : ""}
          </Text>
        </View>

        <View style={s.callout}>
          <Text>{SECURITY_PREAMBLE}</Text>
        </View>

        {SECURITY_SECTIONS.map((section) => (
          <View key={section.title} wrap={false}>
            <Text style={s.h2}>{section.title}</Text>
            {section.points.map((point, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 6 }}>
                <Text style={{ width: 14, color: C.muted }}>—</Text>
                <Text style={[s.terms, { flex: 1 }]}>{point}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={s.h2}>Who else touches your data</Text>
        <Text style={s.terms}>
          Every third party involved in delivering the service, and what each one is for. This is
          the same list that appears in our data processing agreement.
        </Text>
        <SubProcessorTable />

        <Text style={s.h2}>Asking us something specific</Text>
        <Text style={s.terms}>
          If your procurement process needs an answer that is not here, write to{" "}
          {docAgency().email}. A direct answer to the actual question is more useful than a longer
          document, and we would rather give you one.
        </Text>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

/**
 * The checklist you send after a call.
 *
 * Just what is needed, with the private link printed on it. Fields come from
 * `config/intakeFields.ts`, the same source as the form itself, so the paper
 * cannot ask for something the form does not collect.
 *
 * Rendered on demand and never stored — it carries a live onboarding link, and
 * a live link sitting in the documents table behind a 30-day signed URL is a
 * wider blast radius than this needs.
 */
export function IntakeRequestDoc({
  kind,
  url,
  recipient,
}: {
  kind: "client" | "staff";
  url?: string | null;
  recipient?: string | null;
}) {
  const fields = intakeFieldsFor(kind);
  const no = kind === "client" ? "ONBOARDING" : "ONBOARDING-TEAM";
  const us = docAgency().name;

  return (
    <Document title={`${intakeTitleFor(kind)} — ${us}`} author={us}>
      <Page size="A4" style={s.page}>
        <DocHeader type="What we need" number={no} />

        <View style={{ marginTop: 26 }}>
          <Text style={s.h1}>{intakeTitleFor(kind)}</Text>
          <Text style={s.muted}>
            {recipient ? `For ${recipient}. ` : ""}
            {kind === "client"
              ? `A short list so we can set up your ${us} account and get the paperwork right first time.`
              : `A short list so we can get you set up on the ${us} system.`}
          </Text>
        </View>

        {url && (
          <View style={s.callout}>
            <Text style={{ fontWeight: 500, marginBottom: 4 }}>
              Fastest way — fill it in online
            </Text>
            <Text>{url}</Text>
            <Text style={[s.muted, { marginTop: 4, fontSize: 9.5 }]}>
              Private to you, works on a phone, takes about two minutes. Or write your answers
              below and send them back.
            </Text>
          </View>
        )}

        <Text style={s.h2}>What to send</Text>
        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.thText, { flex: 1.5 }]}>Detail</Text>
            <Text style={[s.thText, { flex: 2 }]}>Your answer</Text>
          </View>
          {fields.map((f) => (
            <View key={f.key} style={s.tr} wrap={false}>
              <View style={{ flex: 1.5, paddingRight: 10 }}>
                <Text style={{ fontWeight: 500 }}>
                  {f.label}
                  {f.required ? " *" : ""}
                </Text>
                {f.hint && <Text style={[s.muted, { fontSize: 9 }]}>{f.hint}</Text>}
              </View>
              {/* A ruled line rather than an empty cell — this gets printed and
                  written on by hand more often than anyone plans for. */}
              <View style={{ flex: 2, justifyContent: "flex-end", paddingBottom: 2 }}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: C.line, height: 14 }} />
              </View>
            </View>
          ))}
        </View>

        <Text style={[s.muted, { marginTop: 10, fontSize: 9.5 }]}>
          * Required. Everything else is optional and can follow later.
        </Text>

        {kind === "staff" && (
          <>
            <Text style={s.h2}>Not on this list</Text>
            <Text style={s.terms}>
              Salary, job title and team are set by {us} on your profile — nothing for you to
              fill in here. Your bank details are used only to pay you, and are visible to the
              owner alone.
            </Text>
          </>
        )}

        <Text style={s.h2}>What happens next</Text>
        <Text style={s.terms}>
          {kind === "client"
            ? "Once we have these we create your account and email you a login. From there you can see project progress, invoices, files and meetings in one place, without chasing anyone for an update."
            : "Once we have these we create your account and email you a login. You will find your tasks, hours, attendance and payslips there."}
        </Text>

        <Text style={[s.muted, { marginTop: 18, fontSize: 9.5 }]}>
          Any questions, reply to us at {docAgency().email} or on WhatsApp at {CONTACT_WHATSAPP}.
        </Text>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}
