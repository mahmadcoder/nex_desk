import { Document, Page, Text, View } from "@react-pdf/renderer";
import { s, C } from "./theme";
import { DocHeader, DocFooter, Field, fmt, date } from "./parts";

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
        <Text style={{ fontWeight: 500 }}>Nex Desk</Text>
        <Text>ahmadsadiq.dev@gmail.com</Text>
        <Text>Multan, Pakistan</Text>
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
              {it.note && <Text style={[s.muted, { fontSize: 8, marginTop: 2 }]}>{it.note}</Text>}
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
export function AgreementDoc({ deal, client }: { deal: any; client: Party }) {
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
            {deal.revisions_included} revision rounds included · delivery by {date(deal.deadline)}
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

        <Text style={s.h2}>6. Acceptance</Text>
        <Text style={s.terms}>
          By approving this agreement in writing or by paying the advance invoice, both
          parties accept the scope, price, timeline and terms set out above. This document
          supersedes any prior verbal discussion.
        </Text>

        <View style={s.signRow}>
          <View style={s.signBox}>
            <Text style={s.label}>For the client</Text>
            <Text style={{ marginTop: 12, fontWeight: 500 }}>{deal.signature_name || client.name}</Text>
            <Text style={s.muted}>{client.company || client.email}</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Date: {date(deal.signature_date ?? deal.locked_at)}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>For Nex Desk</Text>
            <Text style={{ marginTop: 12, fontWeight: 500 }}>Nex Desk</Text>
            <Text style={s.muted}>ahmadsadiq.dev@gmail.com</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Date: {date(deal.locked_at)}</Text>
          </View>
        </View>

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
            ["Issued", date(deal.created_at)],
            ["Valid until", date(new Date(Date.now() + 14 * 864e5).toISOString())],
            ["Est. duration", `${deal.duration_days ?? "—"} days`],
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
            This quote is valid for 14 days. Nothing is committed until you approve it in
            writing, at which point it becomes a signed agreement.
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
            Send the payment screenshot to ahmadsadiq.dev@gmail.com and you get a receipt the same day.
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

        <View style={{ marginTop: 30, alignItems: "center", paddingVertical: 26, borderWidth: 1, borderColor: C.line, borderRadius: 6, backgroundColor: "#F1EEE4" }}>
          <Text style={s.label}>Amount received</Text>
          <Text style={{ fontSize: 32, fontWeight: 500, letterSpacing: -1, marginVertical: 4 }}>
            {fmt(Number(payment.amount), payment.currency)}
          </Text>
          <Text style={s.muted}>Received on {date(payment.paid_on)}</Text>
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
  const no = `PR-${String(project.id).slice(0, 6).toUpperCase()}-${new Date().toISOString().slice(0, 10)}`;
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
                {m.description && <Text style={[s.muted, { fontSize: 8 }]}>{m.description}</Text>}
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
            ["Warranty until", date(new Date(Date.now() + 30 * 864e5).toISOString())],
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
        <Text style={s.terms}>
          Bugs in the delivered scope are fixed free of charge for 30 days from the handover
          date above. This does not cover new features, third-party service outages, changes
          made by others to the codebase, or content updates. A monthly retainer covering
          updates, backups, monitoring and change hours is available on request.
        </Text>

        <View style={s.signRow}>
          <View style={s.signBox}>
            <Text style={s.label}>Received by</Text>
            <Text style={{ marginTop: 12 }}>{client.name}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>Delivered by</Text>
            <Text style={{ marginTop: 12 }}>Nex Desk</Text>
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
          <Text style={[s.h1, { fontSize: 15, color: C.ink }]}>{title.toUpperCase()}</Text>
          <Text style={{ fontSize: 8, color: C.muted, marginTop: 3 }}>
            Nex Desk Software Agency · nexdesk.agency · hello@nexdesk.agency · +92 300 1234567 · Multan, PK
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
                <Text key={idx} style={[s.h2, { fontSize: 9.5, marginTop: 8, marginBottom: 3, color: C.ink }]} wrap={false}>
                  {line}
                </Text>
              );
            }
            return (
              <Text key={idx} style={{ fontSize: 8.5, lineHeight: 1.4, color: C.ink, marginBottom: 4 }}>
                {line}
              </Text>
            );
          })}
        </View>

        <View style={[s.signRow, { marginTop: 16 }]} wrap={false}>
          <View style={s.signBox}>
            <Text style={s.label}>Authorized Representative</Text>
            <Text style={{ marginTop: 8, fontSize: 8.5, color: C.ink }}>Nex Desk Software Agency</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>Client Acceptance & Sign-Off</Text>
            <Text style={{ marginTop: 8, fontSize: 8.5, color: C.ink }}>Client Organization</Text>
          </View>
        </View>

        <DocFooter number={no} />
      </Page>
    </Document>
  );
}

