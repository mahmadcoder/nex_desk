"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { lockDeal } from "@/lib/actions";
import { sendQuote } from "@/lib/actions/quotes";
import { noteTemplateUsed } from "@/lib/actions/agreements";
import { money, CURRENCIES } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import AIAssist from "@/components/ui/AIAssist";
import { Trash2, Plus, Send } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Client = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  preferred_currency?: string | null;
};

const field =
  "w-full h-10 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";
const label = "mono-tag mb-1.5 block whitespace-nowrap overflow-hidden text-ellipsis";

export default function DealForm({
  clients, services, defaultTerms, taxDefault, defaultCurrency, initialClientId, templates = [],
  initialDeal,
}: {
  clients: Client[];
  services: { slug: string; title: string; starting_at: number | null }[];
  defaultTerms: string;
  taxDefault: number;
  defaultCurrency: string;
  /** Preselected from ?client= when adding another service to a client. */
  initialClientId?: string;
  /** Saved standard packages. */
  templates?: any[];
  /**
   * An existing deal to edit. Set on the deal page so a quote can be revised
   * after negotiation — previously the only way to change a sent quote was to
   * build a second deal from scratch.
   */
  initialDeal?: any;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(true);

  const editing = !!initialDeal?.id;

  // Adopting the client's currency up front matters: the form is often opened
  // straight from a client profile to sell them a second service.
  const preselected = clients.find((c) => c.id === (initialDeal?.client_id ?? initialClientId));

  const [d, setD] = useState({
    client_id: preselected?.id ?? "",
    title: initialDeal?.title ?? "",
    summary: initialDeal?.summary ?? "",
    scope: initialDeal?.scope ?? "",
    exclusions: initialDeal?.exclusions ?? "",
    currency: initialDeal?.currency || preselected?.preferred_currency || defaultCurrency,
    discount: Number(initialDeal?.discount ?? 0),
    tax_percent: Number(initialDeal?.tax_percent ?? taxDefault),
    advance_percent: Number(initialDeal?.advance_percent ?? 50),
    duration_days: Number(initialDeal?.duration_days ?? 30),
    start_date: initialDeal?.start_date ?? new Date().toISOString().slice(0, 10),
    deadline: initialDeal?.deadline ?? new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    revisions_included: Number(initialDeal?.revisions_included ?? 2),
    // Free defect-fix days sold with this deal. Copied onto the project when
    // the deal is locked; 0 is valid for a fixed-scope job with no support.
    warranty_days: Number(initialDeal?.warranty_days ?? 14),
    terms: initialDeal?.terms ?? defaultTerms,
    signature_name: initialDeal?.signature_name ?? "",
  });

  // Typed explicitly: `initialDeal` is `any`, so inferring the state from the
  // ternary would silently widen every deliverable to `any`.
  type Deliverable = { item: string; qty: number; price: number; note: string };
  type Stage = { label: string; percent: number; due_on: string };

  const [items, setItems] = useState<Deliverable[]>(
    initialDeal?.deliverables?.length
      ? (initialDeal.deliverables as Deliverable[])
      : [{ item: "", qty: 1, price: 0, note: "" }]
  );
  // Which catalogue services this deal covers. Saved on the deal so the daily
  // work log can ask SEO questions on an SEO project and engineering questions
  // on a build.
  const [serviceSlugs, setServiceSlugs] = useState<string[]>(initialDeal?.service_slugs ?? []);
  const [schedule, setSchedule] = useState<Stage[]>(
    initialDeal?.payment_schedule?.length
      ? initialDeal.payment_schedule.map((p: any) => ({
          label: String(p.label ?? ""),
          percent: Number(p.percent ?? 0),
          // A null due date round-trips as an empty input, not the string "null".
          due_on: p.due_on ?? "",
        }))
      : [
          { label: "Advance to start", percent: 50, due_on: "" },
          { label: "On delivery", percent: 50, due_on: "" },
        ]
  );

  const set = (k: string, v: unknown) => setD((p) => ({ ...p, [k]: v }));

  /**
   * Fills the whole form from a saved package. The client and the dates are
   * deliberately left alone — those are the only parts that are genuinely
   * per-deal, and overwriting a client you just picked would be maddening.
   */
  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((x: any) => x.id === templateId);
    if (!tpl) return;

    setD((p) => ({
      ...p,
      title: p.title || tpl.name,
      summary: tpl.description ?? p.summary,
      scope: tpl.scope ?? p.scope,
      exclusions: tpl.exclusions ?? p.exclusions,
      terms: tpl.terms ?? p.terms,
      // A client already chosen keeps their own currency.
      currency: p.client_id ? p.currency : tpl.currency || p.currency,
      tax_percent: Number(tpl.tax_percent ?? p.tax_percent),
      duration_days: Number(tpl.duration_days ?? p.duration_days),
      revisions_included: Number(tpl.revisions_included ?? p.revisions_included),
      warranty_days: Number(tpl.warranty_days ?? p.warranty_days),
    }));

    if (Array.isArray(tpl.service_slugs) && tpl.service_slugs.length) {
      setServiceSlugs(tpl.service_slugs);
    }
    if (Array.isArray(tpl.deliverables) && tpl.deliverables.length) {
      setItems(tpl.deliverables);
    }
    if (Array.isArray(tpl.payment_schedule) && tpl.payment_schedule.length) {
      setSchedule(tpl.payment_schedule);
    }

    toast.success(`Loaded "${tpl.name}". Adjust anything before locking.`);
    noteTemplateUsed(templateId).catch(() => {});
  };

  /**
   * Picking a client also adopts their billing currency, so a client you
   * already invoice in USD does not silently get a PKR agreement.
   */
  const selectClient = (clientId: string) => {
    const picked = clients.find((c) => c.id === clientId);
    setD((p) => ({
      ...p,
      client_id: clientId,
      currency: picked?.preferred_currency || p.currency,
    }));
  };

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0),
    [items]
  );
  const taxed = (subtotal - Number(d.discount)) * (Number(d.tax_percent) / 100);
  const total = subtotal - Number(d.discount) + taxed;
  const scheduleSum = schedule.reduce((s, p) => s + Number(p.percent || 0), 0);

  const client = clients.find((c) => c.id === d.client_id);

  /** Shared by both exits — the payload is identical either way. */
  function validate() {
    if (!d.client_id) { toast.error("Pick a client first."); return false; }
    if (!d.title) { toast.error("Give the project a name."); return false; }
    if (total <= 0) { toast.error("Add at least one deliverable with a price."); return false; }
    if (scheduleSum !== 100) {
      toast.error(`Payment schedule adds up to ${scheduleSum}%, not 100%.`);
      return false;
    }
    return true;
  }

  const payload = () => ({
    // Carrying the id turns the upsert into an update. Without it, revising a
    // quote would insert a SECOND deal with a fresh number while the original
    // sat in `sent`, still being chased by the cron.
    ...(editing ? { id: initialDeal.id } : {}),
    ...d,
    discount: Number(d.discount),
    tax_percent: Number(d.tax_percent),
    duration_days: Number(d.duration_days),
    revisions_included: Number(d.revisions_included),
    warranty_days: Number(d.warranty_days),
    advance_percent: Number(schedule[0]?.percent ?? 50),
    subtotal,
    total,
    service_slugs: serviceSlugs,
    deliverables: items.filter((i) => i.item),
    payment_schedule: schedule.map((p) => ({
      ...p,
      amount: (total * Number(p.percent)) / 100,
      due_on: p.due_on || null,
    })),
  });

  async function submit() {
    if (!validate()) return;

    setBusy(true);
    try {
      const res = await lockDeal(payload(), { sendEmail: notify });

      toast.success(
        notify
          ? "Deal locked. Agreement and invoice are on their way to the client."
          : "Deal locked. Nothing emailed yet."
      );
      router.push(`/${process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control"}/projects/${res.projectId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't lock the deal.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * The other exit: email it as a quotation and park it in the pipeline.
   *
   * No project, no milestones, no invoice — none of that should exist until
   * the client has actually said yes. `lockQuote` runs the whole provisioning
   * step later, from the deal page.
   */
  async function submitQuote() {
    if (!validate()) return;

    setBusy(true);
    try {
      const res = await sendQuote(payload());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // The save and the send are separate outcomes — a saved quote that could
      // not be emailed must not report itself as sent.
      if (res.emailed) {
        toast.success(`Quote ${res.dealNo} sent. It will be chased on day 3, 7 and 14.`);
      } else {
        toast.warning(`Quote ${res.dealNo} saved, but the email did not go out. Send it from the deal page.`);
      }
      router.push(`/${process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control"}/deals/${res.dealId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the quote.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* ---- client + project ---- */}
        <section className="card p-6">
          <h2 className="mb-5 text-base">Who and what</h2>

          {!!templates.length && (
            <div className="mb-5 rounded-lg border border-lime-400/20 bg-lime-400/[0.05] p-3.5">
              <label className="mono-tag mb-1.5 block text-[11px] text-lime-300">
                Start from a saved package
              </label>
              <CustomSelect
                placeholder="Build this one from scratch"
                value=""
                onChange={applyTemplate}
                options={templates.map((x: any) => ({
                  value: x.id,
                  label: x.name,
                  badge: x.use_count > 0 ? `used ${x.use_count}×` : undefined,
                }))}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-bone-300">
                Fills the deliverables, schedule, scope and terms. Your client and dates
                are left as they are.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Client</label>
              <CustomSelect
                placeholder="Select a client…"
                value={d.client_id}
                onChange={selectClient}
                options={clients.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.company ? ` — ${c.company}` : ""}`,
                  badge: c.preferred_currency || undefined,
                }))}
              />
              {client && <p className="mt-1.5 text-xs text-bone-400">Agreement goes to {client.email}</p>}
            </div>
            <div>
              <label className={label}>Project name</label>
              <input className={field} value={d.title} onChange={(e) => set("title", e.target.value)}
                placeholder="Company website rebuild" />
            </div>
          </div>

          <div className="mt-4">
            <label className={label}>One-line summary</label>
            <input className={field} value={d.summary} onChange={(e) => set("summary", e.target.value)}
              placeholder="Six-page marketing site with CMS and lead capture." />
            <AIAssist
              field="deal_summary"
              getText={() => d.summary}
              context={{ project_title: d.title, client_company: client?.company ?? client?.name, deliverables: items.map((i) => i.item).filter(Boolean).join(", ") }}
              onApply={(v) => set("summary", v)}
            />
          </div>

          <div className="mt-4">
            <label className={label}>Scope of work</label>
            <textarea className={`${field} min-h-28 resize-y`} value={d.scope} onChange={(e) => set("scope", e.target.value)}
              placeholder="Be specific. This is what the client can hold you to, and what protects you from silent scope creep." />
            <AIAssist
              field="deal_scope"
              getText={() => d.scope}
              context={{ project_title: d.title, deliverables: items.map((i) => i.item).filter(Boolean).join(", ") }}
              onApply={(v) => set("scope", v)}
            />
          </div>

          <div className="mt-4">
            <label className={label}>Explicitly not included</label>
            <textarea className={`${field} min-h-20 resize-y`} value={d.exclusions} onChange={(e) => set("exclusions", e.target.value)}
              placeholder="Content writing, product photography, ad spend, third-party licences." />
            <AIAssist
              field="deal_exclusions"
              getText={() => d.exclusions}
              context={{ project_title: d.title, scope: d.scope }}
              onApply={(v) => set("exclusions", v)}
            />
          </div>
        </section>

        {/* ---- deliverables ---- */}
        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base">Deliverables and price</h2>
            {/* Resets to empty after each pick so the same service can be added
                twice — this is an action menu, not a bound value. */}
            <div className="w-full sm:w-64">
              <CustomSelect
                placeholder="+ add from services…"
                value=""
                onChange={(slug) => {
                  const s = services.find((x) => x.slug === slug);
                  if (s) {
                    setItems((p) => [
                      ...p.filter((i) => i.item),
                      { item: s.title, qty: 1, price: Number(s.starting_at ?? 0), note: "" },
                    ]);
                    setServiceSlugs((prev) =>
                      prev.includes(s.slug) ? prev : [...prev, s.slug]
                    );
                  }
                }}
                options={services.map((s) => ({ value: s.slug, label: s.title }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_70px_130px_32px] sm:items-center">
                <div>
                  <input className={field} placeholder="Deliverable" value={it.item}
                    onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, item: e.target.value } : x))} />
                  <input className={`${field} mt-1.5 text-xs`} placeholder="Note (optional)" value={it.note}
                    onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} />
                </div>
                <input className={field} type="number" min={1} value={it.qty}
                  onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} />
                <input className={field} type="text" inputMode="decimal" placeholder="0" value={it.price || ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                      setItems((p) => p.map((x, j) => j === i ? { ...x, price: raw === "" ? 0 : Number(raw) } : x));
                    }
                  }} />
                <button type="button" className="text-bone-400 hover:text-[#F87171]"
                  onClick={() => setItems((p) => p.filter((_, j) => j !== i))} aria-label="Remove line">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="mono-tag mt-4 flex items-center gap-1.5 hover:text-lime-400"
            onClick={() => setItems((p) => [...p, { item: "", qty: 1, price: 0, note: "" }])}>
            <Plus size={13} /> add line
          </button>

          {/* Currency lives in the summary rail next to the total — it used to
              sit here, easy to miss, and every deal defaulted to PKR. */}
          <div className="mt-6 grid gap-4 border-t border-ink-600 pt-5 sm:grid-cols-2">
            <div>
              <label className={label}>Discount</label>
              <input className={field} type="number" min={0} value={d.discount} onChange={(e) => set("discount", e.target.value)} />
            </div>
            <div>
              <label className={label}>Tax %</label>
              <input className={field} type="number" min={0} value={d.tax_percent} onChange={(e) => set("tax_percent", e.target.value)} />
            </div>
          </div>
        </section>

        {/* ---- schedule ---- */}
        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base">Payment schedule</h2>
            <span className={`mono-tag ${scheduleSum === 100 ? "text-lime-400" : "text-[#FBBF24]"}`}>
              {scheduleSum}% of 100%
            </span>
          </div>

          <div className="space-y-3">
            {schedule.map((p, i) => (
              <div key={i} className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_75px_165px_110px_32px] sm:items-center">
                <input className={field} placeholder="Stage" value={p.label}
                  onChange={(e) => setSchedule((s) => s.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                <input className={field} type="number" min={0} max={100} value={p.percent}
                  onChange={(e) => setSchedule((s) => s.map((x, j) => j === i ? { ...x, percent: Number(e.target.value) } : x))} />
                <input className={field} type="date" value={p.due_on}
                  onChange={(e) => setSchedule((s) => s.map((x, j) => j === i ? { ...x, due_on: e.target.value } : x))} />
                <span className="text-right text-sm text-bone-400" style={{ fontFamily: "var(--font-mono)" }}>
                  {money((total * Number(p.percent || 0)) / 100, d.currency)}
                </span>
                <button type="button" className="text-bone-400 hover:text-[#F87171]"
                  onClick={() => setSchedule((s) => s.filter((_, j) => j !== i))} aria-label="Remove stage">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="mono-tag mt-4 flex items-center gap-1.5 hover:text-lime-400"
            onClick={() => setSchedule((s) => [...s, { label: "", percent: 0, due_on: "" }])}>
            <Plus size={13} /> add stage
          </button>

          <p className="mt-4 text-xs text-bone-400">
            The first stage becomes the advance invoice, raised and emailed automatically when you lock this deal.
          </p>
        </section>

        {/* ---- timeline + terms ---- */}
        <section className="card p-6">
          <h2 className="mb-5 text-base">Timeline and terms</h2>
          <div className="grid items-start gap-x-4 gap-y-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-5">
            <div>
              <label className={label}>Start date</label>
              <input className={field} type="date" value={d.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div>
              <label className={label}>Deadline</label>
              <input className={field} type="date" value={d.deadline} onChange={(e) => set("deadline", e.target.value)} />
            </div>
            <div>
              <label className={label}>Working days</label>
              <input className={field} type="number" min={1} value={d.duration_days} onChange={(e) => set("duration_days", e.target.value)} />
            </div>
            <div>
              <label className={label}>Revision rounds</label>
              <input className={field} type="number" min={0} value={d.revisions_included} onChange={(e) => set("revisions_included", e.target.value)} />
            </div>
            <div>
              <label className={label}>Support days</label>
              <input
                className={field}
                type="number"
                min={0}
                max={365}
                value={d.warranty_days}
                onChange={(e) => set("warranty_days", e.target.value)}
              />
              <p className="mt-1 text-[11px] leading-relaxed text-bone-500">
                Free bug fixes after handover. Whatever is here goes on the agreement and
                becomes this project&rsquo;s window — 0 for none.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className={label}>Terms and conditions</label>
            <textarea className={`${field} min-h-56 resize-y font-mono text-xs leading-relaxed`}
              value={d.terms} onChange={(e) => set("terms", e.target.value)} />
            <p className="mt-1.5 text-xs text-bone-400">
              Pulled from Settings. Edit here for this deal only.
            </p>
          </div>

          <div className="mt-4">
            <label className={label}>Signatory name on the client side</label>
            <input className={field} value={d.signature_name} onChange={(e) => set("signature_name", e.target.value)}
              placeholder={client?.name ?? "Leave blank to use the client name"} />
          </div>
        </section>
      </div>

      {/* ---- summary rail ---- */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="card p-6">
          <h2 className="text-base">Summary</h2>

          <div className="mt-4 rounded-lg border border-ink-600 bg-ink-900/60 p-3">
            <label className={label}>Bill this deal in</label>
            <CustomSelect
              value={d.currency}
              onChange={(v) => set("currency", v)}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-bone-400">
              Applies to the agreement, the invoice and the client portal. Saved to the
              client so future deals match.
            </p>
          </div>

          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-bone-400">Subtotal</dt><dd>{money(subtotal, d.currency)}</dd></div>
            {Number(d.discount) > 0 && (
              <div className="flex justify-between"><dt className="text-bone-400">Discount</dt><dd>− {money(Number(d.discount), d.currency)}</dd></div>
            )}
            {Number(d.tax_percent) > 0 && (
              <div className="flex justify-between"><dt className="text-bone-400">Tax {d.tax_percent}%</dt><dd>{money(taxed, d.currency)}</dd></div>
            )}
            <div className="flex justify-between border-t border-ink-600 pt-3 text-lg">
              <dt>Total</dt>
              <dd style={{ fontFamily: "var(--font-display)" }}>{money(total, d.currency)}</dd>
            </div>
          </dl>

          <div className="mt-6 space-y-2 border-t border-ink-600 pt-5 text-xs text-bone-400">
            <p>Advance due: <span className="text-bone-50">{money((total * Number(schedule[0]?.percent ?? 0)) / 100, d.currency)}</span></p>
            <p>Deadline: <span className="text-bone-50">{d.deadline || "—"}</span></p>
            <p>Revisions: <span className="text-bone-50">{d.revisions_included} rounds</span></p>
            <p>
              Support:{" "}
              <span className="text-bone-50">
                {Number(d.warranty_days) > 0 ? `${d.warranty_days} days after handover` : "none included"}
              </span>
            </p>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-2.5 border-t border-ink-600 pt-5 text-xs">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5 accent-[color:var(--color-lime-400)]" />
            <span className="text-bone-400">
              Email the client the agreement PDF and advance invoice as soon as this is locked.
            </span>
          </label>

          <button className="btn btn-primary mt-5 w-full justify-center" onClick={submit} disabled={busy}>
            {busy ? "Locking…" : "Lock the deal"}
          </button>

          <p className="mt-3 text-xs leading-relaxed text-bone-400">
            Locking creates the project and its milestones, raises the advance invoice,
            generates the signed agreement PDF and emails it — all in one step.
          </p>

          {/* The second exit. Deliberately the quieter button: work agreed on a
              call should still go straight to locked without a detour. */}
          <div className="mt-5 border-t border-ink-600 pt-5">
            <button
              className="btn w-full justify-center gap-2"
              onClick={submitQuote}
              disabled={busy}
            >
              <Send size={14} />
              {busy ? "Sending…" : editing ? "Send the revised quote" : "Send as a quote instead"}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-bone-400">
              {editing
                ? "Re-sends the quotation with these figures and restarts the follow-up clock — the numbers changed, so the conversation starts again."
                : "Emails the quotation and waits for their answer. No project, no invoice and nothing committed until you mark it won. Chased for you on day 3, 7 and 14."}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
