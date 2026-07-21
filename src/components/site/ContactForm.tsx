"use client";
import { useState } from "react";
import { toast } from "sonner";

const SERVICES = [
  ["web-development", "Web development"],
  ["web-design", "Web design"],
  ["seo", "SEO"],
  ["paid-ads", "Paid ads"],
  ["mobile-apps", "Mobile app"],
  ["ecommerce", "E-commerce"],
  ["branding", "Branding"],
  ["ai-automation", "AI & automation"],
  ["social-media", "Social media"],
  ["other", "Something else"],
];

const BUDGETS = ["Under Rs 100k", "Rs 100k – 300k", "Rs 300k – 700k", "Rs 700k+", "Not sure yet"];
const TIMELINES = ["ASAP", "2–4 weeks", "1–3 months", "Just exploring"];

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-4 py-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";

export default function ContactForm() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", city: "", country: "Pakistan",
    service_slugs: [] as string[], budget_range: "", timeline: "", message: "",
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleService = (slug: string) =>
    set(
      "service_slugs",
      form.service_slugs.includes(slug)
        ? form.service_slugs.filter((s) => s !== slug)
        : [...form.service_slugs, slug]
    );

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Try emailing us instead.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-10 text-center">
        <p className="drawer-label justify-center">Received</p>
        <h3 className="mt-6 text-3xl">Thanks, {form.name.split(" ")[0]}.</h3>
        <p className="mx-auto mt-4 max-w-md text-bone-400">
          A confirmation is in your inbox. A real person reads every message and you&apos;ll
          hear back within one working day.
        </p>
      </div>
    );
  }

  const canNext =
    step === 0 ? form.service_slugs.length > 0 : step === 1 ? !!form.budget_range : true;

  return (
    <div className="card p-8 sm:p-10">
      <div className="mb-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-0.5 flex-1 ${i <= step ? "bg-lime-400" : "bg-ink-600"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <>
          <p className="drawer-label">Step 1 of 3</p>
          <h3 className="mt-4 text-2xl">What do you need?</h3>
          <p className="mt-2 text-sm text-bone-400">Pick everything that applies.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SERVICES.map(([slug, label]) => {
              const on = form.service_slugs.includes(slug);
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleService(slug)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    on
                      ? "border-lime-400 bg-lime-400 text-lime-950"
                      : "border-ink-500 text-bone-200 hover:border-ink-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <p className="drawer-label">Step 2 of 3</p>
          <h3 className="mt-4 text-2xl">Budget and timing</h3>
          <p className="mt-2 text-sm text-bone-400">
            An honest range saves us both a call. Nothing is binding.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <label className="mono-tag">Budget</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set("budget_range", b)}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      form.budget_range === b
                        ? "border-lime-400 bg-lime-400 text-lime-950"
                        : "border-ink-500 text-bone-200"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mono-tag">Timeline</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {TIMELINES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("timeline", t)}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      form.timeline === t
                        ? "border-lime-400 bg-lime-400 text-lime-950"
                        : "border-ink-500 text-bone-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="drawer-label">Step 3 of 3</p>
          <h3 className="mt-4 text-2xl">Where do we reach you?</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <input className={field} placeholder="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <input className={field} placeholder="name@company.com" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            <input className={field} placeholder="Phone or WhatsApp" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <input className={field} placeholder="Company (optional)" value={form.company} onChange={(e) => set("company", e.target.value)} />
            <input className={field} placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
            <input className={field} placeholder="Country" value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <textarea
            className={`${field} mt-4 min-h-32 resize-y`}
            placeholder="Tell us about the project. Links to anything you like help."
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
          />
        </>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn h-11"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{ opacity: step === 0 ? 0.35 : 1 }}
        >
          Back
        </button>

        {step < 2 ? (
          <button
            type="button"
            className="btn btn-primary h-11"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            style={{ opacity: canNext ? 1 : 0.4 }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary h-11"
            onClick={submit}
            disabled={busy || !form.name || !form.email}
            style={{ opacity: busy || !form.name || !form.email ? 0.4 : 1 }}
          >
            {busy ? "Sending…" : "Send it"}
          </button>
        )}
      </div>
    </div>
  );
}
