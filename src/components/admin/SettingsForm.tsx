"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/lib/actions";
import { Badge } from "./ui";

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
    default_currency: settings?.default_currency ?? "PKR",
    tax_percent: settings?.tax_percent ?? 0,
    invoice_prefix: settings?.invoice_prefix ?? "ND",
    email_signature: settings?.email_signature ?? "",
    default_terms: settings?.default_terms ?? "",
  });
  const [bank, setBank] = useState<Record<string, string>>(settings?.bank_details ?? {
    "Account title": "", "Bank": "", "Account number": "", "IBAN": "", "Branch code": "",
  });

  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const save = () => start(async () => {
    await saveSettings({ ...f, tax_percent: Number(f.tax_percent), bank_details: bank });
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
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-base">Billing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Default currency</label>
            <select className={field} value={f.default_currency} onChange={(e) => set("default_currency", e.target.value)}>
              {["PKR", "USD", "GBP", "EUR", "AED"].map((c) => <option key={c}>{c}</option>)}
            </select>
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
            <div key={k} className="grid grid-cols-[130px_1fr] items-center gap-2">
              <span className="mono-tag">{k}</span>
              <input className={field} value={bank[k]} onChange={(e) => setBank({ ...bank, [k]: e.target.value })} />
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6 xl:col-span-2">
        <h2 className="mb-2 text-base">Default terms and conditions</h2>
        <p className="mb-4 text-xs text-bone-400">
          Loaded into every new deal. You can still edit them per deal without changing this.
        </p>
        <textarea className={`${field} min-h-64 resize-y font-mono text-xs leading-relaxed`}
          value={f.default_terms} onChange={(e) => set("default_terms", e.target.value)} />

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
