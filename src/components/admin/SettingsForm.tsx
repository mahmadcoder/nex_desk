"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/lib/actions";
import { CURRENCIES } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import { Badge } from "./ui";
import ImageUpload from "@/components/admin/ImageUpload";

import SignaturePad from "@/components/ui/SignaturePad";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field = "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";
const label = "mono-tag mb-1.5 block";

export default function SettingsForm({ settings, staff }: { settings: any; staff: any[] }) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    company_name: settings?.company_name ?? "Nex Desk",
    tagline: settings?.tagline ?? "",
    email: settings?.email ?? "",
    phone: settings?.phone ?? "",
    whatsapp: settings?.whatsapp ?? "",
    address: settings?.address ?? "",
    city: settings?.city ?? "",
    country: settings?.country ?? "Pakistan",
    tax_id: settings?.tax_id ?? "",
    logo_url: settings?.logo_url ?? "",
    admin_signature: settings?.admin_signature ?? "",
    default_currency: settings?.default_currency ?? "PKR",
    tax_percent: settings?.tax_percent ?? 0,
    invoice_prefix: settings?.invoice_prefix ?? "ND",
    email_signature: settings?.email_signature ?? "",
    default_terms: settings?.default_terms ?? "",
    refund_policy: settings?.refund_policy ?? "",
    booking_fee_pct: settings?.booking_fee_pct ?? 25,
    refund_grace_hours: settings?.refund_grace_hours ?? 48,
    // Attendance is judged against these every time it is displayed, never
    // stored — so changing the grace period re-judges history too.
    work_start: String(settings?.work_start ?? "09:00").slice(0, 5),
    work_end: String(settings?.work_end ?? "18:00").slice(0, 5),
    work_grace_min: settings?.work_grace_min ?? 15,
  });
  const [workDays, setWorkDays] = useState<number[]>(
    Array.isArray(settings?.work_days) && settings.work_days.length
      ? settings.work_days.map(Number)
      : [1, 2, 3, 4, 5]
  );
  const [bank, setBank] = useState<Record<string, string>>(settings?.bank_details ?? {
    "Account title": "", "Bank": "", "Account number": "", "IBAN": "", "Branch code": "",
  });

  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const save = () => start(async () => {
    await saveSettings({
      ...f,
      tax_percent: Number(f.tax_percent),
      work_grace_min: Number(f.work_grace_min),
      work_days: workDays.sort((a, b) => a - b),
      bank_details: bank,
    });
    toast.success("Settings saved.");
  });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-6">
        <h2 className="mb-5 text-base">Company</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["company_name", "Company name"], ["email", "Email"], ["phone", "Phone"],
            ["whatsapp", "WhatsApp"], ["city", "City"], ["country", "Country"],
          ].map(([k, l]) => (
            <div key={k}>
              <label className={label}>{l}</label>
              <input className={field} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <label className={label}>Tagline</label>
          <input className={field} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div className="mt-4">
          <label className={label}>Address</label>
          <input className={field} value={f.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="mt-4">
          <label className={label}>Tax / NTN number</label>
          <input
            className={field}
            value={f.tax_id}
            onChange={(e) => set("tax_id", e.target.value)}
            placeholder="Printed on invoices and agreements"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-bone-400">
            You already record the client&rsquo;s tax ID and print it on every document. This is
            yours — it is what lets the business receiving your invoice deduct it.
          </p>
        </div>
        <div className="mt-4">
          <ImageUpload
            label="Logo"
            value={f.logo_url}
            onChange={(url) => set("logo_url", url)}
            folder="brand"
            removeWarning="Documents go back to the drawn Nex Desk mark until you upload another."
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-bone-400">
            Replaces the drawn mark at the top of every PDF. A square PNG with a transparent
            background works best.
          </p>
        </div>

        <div className="mt-5 border-t border-ink-700 pt-5">
          <SignaturePad
            value={f.admin_signature}
            onChange={(sig) => set("admin_signature", sig ?? "")}
            label="Official Agency Signature (for PDFs & agreements)"
            height={120}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-bone-400">
            Draw your official agency signature using a mouse, stylus or touch screen. This signature is rendered on official PDFs under &ldquo;FOR NEX DESK&rdquo;.
          </p>
        </div>

        <p className="mt-5 border-t border-ink-700 pt-4 text-[11px] leading-relaxed text-bone-400">
          Everything on this card appears on your invoices, agreements and emails.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-base">Billing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Default currency</label>
            <CustomSelect
              value={f.default_currency}
              onChange={(v) => set("default_currency", v)}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <label className={label}>Tax %</label>
            <input className={field} type="number" value={f.tax_percent} onChange={(e) => set("tax_percent", e.target.value)} />
          </div>
          <div>
            <label className={label}>Invoice prefix</label>
            <input className={field} value={f.invoice_prefix} onChange={(e) => set("invoice_prefix", e.target.value)} />
          </div>
        </div>

        <h3 className="mb-3 mt-6 text-sm">Bank details</h3>
        <p className="mb-3 text-xs text-bone-400">These print on every invoice under &ldquo;How to pay&rdquo;.</p>
        <div className="space-y-3">
          {Object.keys(bank).map((k) => (
            <div key={k} className="flex flex-col gap-1 sm:grid sm:grid-cols-[130px_1fr] sm:items-center sm:gap-2">
              <span className="mono-tag">{k}</span>
              <input className={field} value={bank[k]} onChange={(e) => setBank({ ...bank, [k]: e.target.value })} />
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-2 text-base">Working hours</h2>
        <p className="mb-5 text-xs leading-relaxed text-bone-400">
          What counts as on time. Attendance is judged against these values every time a
          screen loads and never written down, so widening the grace period corrects past
          days too rather than leaving them flagged under the old rule.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Day starts</label>
            <input className={field} type="time" value={f.work_start} onChange={(e) => set("work_start", e.target.value)} />
          </div>
          <div>
            <label className={label}>Day ends</label>
            <input className={field} type="time" value={f.work_end} onChange={(e) => set("work_end", e.target.value)} />
          </div>
          <div>
            <label className={label}>Grace (minutes)</label>
            <input className={field} type="number" min="0" max="120" value={f.work_grace_min} onChange={(e) => set("work_grace_min", e.target.value)} />
          </div>
        </div>

        <label className={label + " mt-5 block"}>Working days</label>
        <div className="flex flex-wrap gap-2">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => {
            const iso = i + 1;
            const on = workDays.includes(iso);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setWorkDays((p) => (on ? p.filter((x) => x !== iso) : [...p, iso]))}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  on ? "border-lime-400 bg-lime-400 font-medium text-lime-950" : "border-ink-500 text-bone-300 hover:border-ink-400"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-bone-400">
          A non-working day is never marked absent.
        </p>
      </section>

      <section className="card p-6 xl:col-span-2">
        <h2 className="mb-2 text-base">Default terms and conditions</h2>
        <p className="mb-4 text-xs text-bone-400">
          Loaded into every new deal. You can still edit them per deal without changing this.
        </p>
        <textarea className={`${field} min-h-64 resize-y font-mono text-xs leading-relaxed`}
          value={f.default_terms} onChange={(e) => set("default_terms", e.target.value)} />

        <div className="mt-6 border-t border-ink-600 pt-5">
          <label className={label}>Cancellation and refund policy</label>
          <p className="mb-2 mt-1 text-xs leading-relaxed text-bone-400">
            Printed in every agreement, so it is agreed up front rather than argued afterwards.
            The Cancel-project panel works to these rules.
          </p>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Booking fee (%)</label>
              <input className={field} type="number" min={0} max={100}
                value={f.booking_fee_pct}
                onChange={(e) => set("booking_fee_pct", Number(e.target.value))} />
              <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                The least you keep on a cancellation, charged on what the client actually paid.
                Only applies when it is more than the work delivered. 0 turns it off.
              </p>
            </div>
            <div>
              <label className={label}>Grace window (hours)</label>
              <input className={field} type="number" min={0} max={336}
                value={f.refund_grace_hours}
                onChange={(e) => set("refund_grace_hours", Number(e.target.value))} />
              <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                Cancel within this long of the first payment, before work starts, and the
                booking fee is waived entirely.
              </p>
            </div>
          </div>

          <textarea className={`${field} min-h-40 resize-y font-mono text-xs leading-relaxed`}
            value={f.refund_policy} onChange={(e) => set("refund_policy", e.target.value)} />
          <p className="mt-2 text-[11px] leading-relaxed text-bone-400">
            Changing these does not alter agreements already signed — each PDF carries the
            wording that was in force when it was generated.
          </p>
        </div>

        <div className="mt-4">
          <label className={label}>Email signature</label>
          <textarea className={`${field} min-h-24 resize-y`} value={f.email_signature}
            onChange={(e) => set("email_signature", e.target.value)} />
        </div>
      </section>

      <section className="card p-6 xl:col-span-2">
        <h2 className="mb-2 text-base">Team</h2>
        <p className="mb-4 text-xs text-bone-400">
          Add staff in Supabase under Authentication → Users, then set their role with{" "}
          <span className="font-mono">update profiles set role = &apos;staff&apos; where email = &apos;…&apos;</span>.
          There is deliberately no signup form.
        </p>
        <div className="divide-y divide-ink-600">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p>{s.full_name ?? s.email}</p>
                <p className="text-xs text-bone-400">{s.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{s.role}</Badge>
                {!s.is_active && <Badge>inactive</Badge>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="xl:col-span-2">
        <button className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
