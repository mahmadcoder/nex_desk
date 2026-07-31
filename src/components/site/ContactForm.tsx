"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { checkEmailExists } from "@/lib/actions";

const SERVICES = [
  ["web-development", "Web development"],
  ["custom-web-development", "Custom Web Development"],
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

const fieldError = "border-rose-500/80 focus:border-rose-500";

/**
 * Deliberately permissive — this catches `afaq88` and `me@gmail`, not exotic
 * but valid addresses. The server re-validates; the job here is to say
 * something useful the moment the field loses focus rather than after submit.
 */
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(v.trim());

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-400">
      <span aria-hidden>⚠</span> {children}
    </p>
  );
}

function ContactFormContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  // One map for every field, so a name error and an email error can show at the
  // same time instead of the last one winning.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", city: "", country: "Pakistan",
    service_slugs: [] as string[], budget_range: "", timeline: "", message: "",
    // Honeypot. It has always been in the API schema and checked server-side,
    // but was never rendered — so the bot trap did nothing. See the hidden
    // input in step 3.
    website: "",
  });
  const [selectedPkgInfo, setSelectedPkgInfo] = useState<{
    serviceSlug: string;
    tierName: string;
    price: string;
  } | null>(null);

  useEffect(() => {
    const serviceParam = searchParams.get("service");
    const packageParam = searchParams.get("package");
    const tierNameParam = searchParams.get("tier_name");
    const priceParam = searchParams.get("price");

    if (serviceParam) {
      const matchSlug = SERVICES.find(([s]) => s === serviceParam || serviceParam.includes(s))?.[0] || serviceParam;
      setForm((f) => ({
        ...f,
        service_slugs: Array.from(new Set([...f.service_slugs, matchSlug])),
        message: f.message || (tierNameParam ? `Inquiry for ${tierNameParam} package (${priceParam ?? "Custom"})` : ""),
      }));

      if (tierNameParam || packageParam) {
        setSelectedPkgInfo({
          serviceSlug: matchSlug,
          tierName: tierNameParam ?? packageParam ?? "Custom Package",
          price: priceParam ?? "Custom Quote",
        });
      }
    }
  }, [searchParams]);

  const set = (k: string, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Typing clears that field's error — leaving a stale "invalid" under an
    // input the person is actively fixing reads as broken.
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  };

  /** Shape checks only. The duplicate-address lookup runs separately on blur. */
  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Please enter your full name.";
    if (!form.email.trim()) next.email = "We need an email address to reply to.";
    else if (!looksLikeEmail(form.email)) next.email = "That doesn't look like a complete email address.";
    return next;
  };

  const toggleService = (slug: string) =>
    set(
      "service_slugs",
      form.service_slugs.includes(slug)
        ? form.service_slugs.filter((s) => s !== slug)
        : [...form.service_slugs, slug]
    );

  async function submit() {
    // Block on the client first, so a malformed address never costs a round
    // trip — and so the message lands under the input, not in a toast.
    const found = validate();
    if (Object.keys(found).length || errors.email) {
      setErrors((e) => ({ ...e, ...found }));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        // A 400 carries per-field detail; map it back onto the inputs rather
        // than flattening it into one message.
        if (payload?.fields && Object.keys(payload.fields).length) {
          setErrors((e) => ({ ...e, ...payload.fields }));
          return;
        }
        throw new Error(payload?.error ?? "Failed");
      }

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
      {selectedPkgInfo && (
        <div className="mb-6 rounded-xl bg-lime-400/10 border border-lime-400/30 p-4 flex items-center justify-between gap-3 text-xs text-lime-400">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="shrink-0" />
            <div>
              <span className="font-semibold text-bone-50 text-sm block">
                Pre-selected Package: {selectedPkgInfo.tierName}
              </span>
              <span>Price: <strong>{selectedPkgInfo.price}</strong> · Service pre-filled below</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPkgInfo(null)}
            className="text-bone-400 hover:text-bone-100 underline text-[11px]"
          >
            Clear
          </button>
        </div>
      )}

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
                      ? "border-lime-400 bg-lime-400 text-lime-950 font-medium"
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
            <div>
              <input
                className={`${field} ${errors.name ? fieldError : ""}`}
                placeholder="Full name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                onBlur={() => {
                  if (form.name && form.name.trim().length < 2) {
                    setErrors((e) => ({ ...e, name: "Please enter your full name." }));
                  }
                }}
                aria-invalid={!!errors.name}
              />
              <FieldError>{errors.name}</FieldError>
            </div>

            <div>
              <input
                className={`${field} ${errors.email ? fieldError : ""}`}
                placeholder="name@company.com"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                onBlur={async () => {
                  if (!form.email.trim()) return;

                  // Shape first. The old code gated this whole block on
                  // `includes("@")`, so `afaq88` never reached any check at all
                  // and the field stayed silent until submit.
                  if (!looksLikeEmail(form.email)) {
                    setErrors((e) => ({ ...e, email: "That doesn't look like a complete email address." }));
                    return;
                  }

                  const res = await checkEmailExists({ email: form.email, target: "lead" });
                  setErrors((e) => ({
                    ...e,
                    email: res.exists
                      ? res.message || "An account or project lead with this email address is already registered."
                      : "",
                  }));
                }}
                aria-invalid={!!errors.email}
              />
              <FieldError>{errors.email}</FieldError>
            </div>

            <input className={field} placeholder="Phone or WhatsApp" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <input className={field} placeholder="Company (optional)" value={form.company} onChange={(e) => set("company", e.target.value)} />
            <input className={field} placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
            <input className={field} placeholder="Country" value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>

          {/* Honeypot: invisible to people, irresistible to form-filling bots.
              A non-empty value makes the API drop the submission silently. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />
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
          // Deliberately clickable with an empty or malformed form: pressing it
          // surfaces the errors under the offending inputs, which teaches more
          // than a greyed-out button that never says why.
          <button
            type="button"
            className="btn btn-primary h-11"
            onClick={submit}
            disabled={busy}
            style={{ opacity: busy ? 0.4 : 1 }}
          >
            {busy ? "Sending…" : "Send it"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ContactForm() {
  return (
    <Suspense fallback={<div className="card p-10 text-center text-bone-400">Loading form...</div>}>
      <ContactFormContent />
    </Suspense>
  );
}
