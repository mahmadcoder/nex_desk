"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveClient } from "@/lib/actions";

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

export default function ClientDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const [f, setF] = useState({
    name: "", email: "", phone: "", company: "", city: "", country: "Pakistan",
    address: "", tax_id: "", preferred_currency: "PKR",
  });

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (!f.name || !f.email) return toast.error("Name and email are required.");
    start(async () => {
      try {
        await saveClient(null, f);
        toast.success(`${f.name} added.`);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save that client.");
      }
    });
  };

  if (!open) return <button className="btn btn-primary h-10" onClick={() => setOpen(true)}>Add client</button>;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-6" onClick={() => setOpen(false)}>
      <div className="card w-full max-w-lg p-7" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg">Add client</h2>
        <p className="mt-1 text-sm text-bone-400">
          The name, email, city and country here appear on every document they receive.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["name", "Full name *"], ["email", "Email *"], ["phone", "Phone"],
            ["company", "Company"], ["city", "City"], ["country", "Country"],
            ["tax_id", "Tax / NTN number"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="mono-tag mb-1.5 block">{label}</label>
              <input className={field} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
          <div>
            <label className="mono-tag mb-1.5 block">Invoice currency</label>
            <select className={field} value={f.preferred_currency} onChange={(e) => set("preferred_currency", e.target.value)}>
              {["PKR", "USD", "GBP", "EUR", "AED"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="btn h-10" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-primary h-10" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Add client"}
          </button>
        </div>
      </div>
    </div>
  );
}
