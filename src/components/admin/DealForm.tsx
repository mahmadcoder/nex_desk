"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { lockDeal } from "@/lib/actions";
import { money } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Client = { id: string; name: string; email: string; company: string | null };

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";
const label = "mono-tag mb-1.5 block";

const CURRENCIES = ["PKR", "USD", "GBP", "EUR", "AED"];

export default function DealForm({
  clients, services, defaultTerms, taxDefault,
}: {
  clients: Client[];
  services: { slug: string; title: string; starting_at: number | null }[];
  defaultTerms: string;
  taxDefault: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(true);

  const [d, setD] = useState({
    client_id: "",
    title: "",
    summary: "",
    scope: "",
    exclusions: "",
    currency: "PKR",
    discount: 0,
    tax_percent: taxDefault,
    advance_percent: 50,
    duration_days: 30,
    start_date: new Date().toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    revisions_included: 2,
    terms: defaultTerms,
    signature_name: "",
  });

  const [items, setItems] = useState([{ item: "", qty: 1, price: 0, note: "" }]);
  const [schedule, setSchedule] = useState([
    { label: "Advance to start", percent: 50, due_on: "" },
    { label: "On delivery", percent: 50, due_on: "" },
  ]);

  const set = (k: string, v: unknown) => setD((p) => ({ ...p, [k]: v }));

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0),
    [items]
  );
  const taxed = (subtotal - Number(d.discount)) * (Number(d.tax_percent) / 100);
  const total = subtotal - Number(d.discount) + taxed;
  const scheduleSum = schedule.reduce((s, p) => s + Number(p.percent || 0), 0);

  const client = clients.find((c) => c.id === d.client_id);

  async function submit() {
    if (!d.client_id) return toast.error("Pick a client first.");
    if (!d.title) return toast.error("Give the project a name.");
    if (total <= 0) return toast.error("Add at least one deliverable with a price.");
    if (scheduleSum !== 100) return toast.error(`Payment schedule adds up to ${scheduleSum}%, not 100%.`);

    setBusy(true);
    try {
      const res = await lockDeal(
        {
          ...d,
          discount: Number(d.discount),
          tax_percent: Number(d.tax_percent),
          duration_days: Number(d.duration_days),
          revisions_included: Number(d.revisions_included),
          advance_percent: Number(schedule[0]?.percent ?? 50),
          subtotal,
          total,
          deliverables: items.filter((i) => i.item),
          payment_schedule: schedule.map((p) => ({
            ...p,
            amount: (total * Number(p.percent)) / 100,
            due_on: p.due_on || null,
          })),
        },
        { sendEmail: notify }
      );

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

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* ---- client + project ---- */}
        <section className="card p-6">
          <h2 className="mb-5 text-base">Who and what</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Client</label>
              <select className={field} value={d.client_id} onChange={(e) => set("client_id", e.target.value)}>
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` — ${c.company}` : ""}
                  </option>
                ))}
              </select>
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
          </div>

          <div className="mt-4">
            <label className={label}>Scope of work</label>
            <textarea className={`${field} min-h-28 resize-y`} value={d.scope} onChange={(e) => set("scope", e.target.value)}
              placeholder="Be specific. This is what the client can hold you to, and what protects you from silent scope creep." />
          </div>

          <div className="mt-4">
            <label className={label}>Explicitly not included</label>
            <textarea className={`${field} min-h-20 resize-y`} value={d.exclusions} onChange={(e) => set("exclusions", e.target.value)}
              placeholder="Content writing, product photography, ad spend, third-party licences." />
          </div>
        </section>

        {/* ---- deliverables ---- */}
        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base">Deliverables and price</h2>
            <select
              className="rounded-lg border border-ink-500 bg-ink-800 px-2 py-1 text-xs"
              value=""
              onChange={(e) => {
                const s = services.find((x) => x.slug === e.target.value);
                if (s) setItems((p) => [...p.filter((i) => i.item), { item: s.title, qty: 1, price: Number(s.starting_at ?? 0), note: "" }]);
              }}
            >
              <option value="">+ add from services…</option>
              {services.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_130px_32px] items-start gap-2">
                <div>
                  <input className={field} placeholder="Deliverable" value={it.item}
                    onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, item: e.target.value } : x))} />
                  <input className={`${field} mt-1.5 text-xs`} placeholder="Note (optional)" value={it.note}
                    onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} />
                </div>
                <input className={field} type="number" min={1} value={it.qty}
                  onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} />
                <input className={field} type="number" min={0} placeholder="0" value={it.price}
                  onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} />
                <button type="button" className="mt-2 text-bone-400 hover:text-[#F87171]"
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

          <div className="mt-6 grid gap-4 border-t border-ink-600 pt-5 sm:grid-cols-3">
            <div>
              <label className={label}>Currency</label>
              <select className={field} value={d.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
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
              <div key={i} className="grid grid-cols-[1fr_80px_150px_100px_32px] items-center gap-2">
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
          <div className="grid gap-4 sm:grid-cols-4">
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
      <aside className="xl:sticky xl:top-8 xl:self-start">
        <div className="card p-6">
          <h2 className="text-base">Summary</h2>

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

          <p className="mt-4 text-xs leading-relaxed text-bone-400">
            Locking creates the project and its milestones, raises the advance invoice,
            generates the signed agreement PDF and emails it — all in one step.
          </p>
        </div>
      </aside>
    </div>
  );
}
