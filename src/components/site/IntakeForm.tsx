"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitIntake } from "@/lib/actions/intake";
import type { IntakeField } from "@/config/intakeFields";

/**
 * The form a client or new team member fills in from a WhatsApp link.
 *
 * Built mobile-first because that is the only place it will ever be opened —
 * nobody moves to a laptop to answer a WhatsApp message. Single column, large
 * targets, and the right keyboard per field via `type`.
 */
export default function IntakeForm({
  token,
  fields,
  title,
  note,
}: {
  token: string;
  fields: IntakeField[];
  title: string;
  note?: string | null;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const submit = () =>
    start(async () => {
      const res = await submitIntake(token, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDone(true);
    });

  if (done) {
    return (
      <div className="card p-8 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-10 w-10 text-lime-400" aria-hidden />
        <h2 className="mt-5 text-2xl text-bone-50">Got it — thank you.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-bone-300">
          We have everything we need. You will get an email when your account is ready. Nothing
          else to do.
        </p>
      </div>
    );
  }

  const missing = fields.filter((f) => f.required && !values[f.key]?.trim());

  return (
    <div className="card p-5 sm:p-8">
      <h1 className="text-2xl text-bone-50">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-bone-300">
        {note?.trim() ||
          "A couple of minutes, and only what we actually need. Anything marked optional can be left blank."}
      </p>

      <div className="mt-7 space-y-5">
        {fields.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="mb-1.5 block text-sm text-bone-200">
              {f.label}
              {f.required && <span className="ml-1 text-lime-400">*</span>}
            </label>

            {f.type === "textarea" ? (
              <textarea
                id={f.key}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full resize-y rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-3 text-base text-bone-50 focus:border-lime-400 focus:outline-none"
              />
            ) : (
              <input
                id={f.key}
                // `type` drives the phone keyboard: an email field without it
                // makes somebody hunt for the @ on a numeric pad.
                type={f.type ?? "text"}
                inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
                autoComplete={
                  f.key.includes("email")
                    ? "email"
                    : f.key.includes("phone")
                      ? "tel"
                      : f.key.includes("name")
                        ? "name"
                        : "on"
                }
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                maxLength={2000}
                // text-base, not text-sm: iOS zooms the whole page in on focus
                // for anything under 16px.
                className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-3 text-base text-bone-50 focus:border-lime-400 focus:outline-none"
              />
            )}

            {f.hint && <p className="mt-1.5 text-xs text-bone-400">{f.hint}</p>}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pending || missing.length > 0}
        className="btn btn-primary mt-8 h-12 w-full justify-center text-base disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Sending…
          </span>
        ) : (
          "Send my details"
        )}
      </button>

      {missing.length > 0 && (
        <p className="mt-2 text-center text-xs text-bone-400">
          Still needed: {missing.map((f) => f.label).join(", ")}
        </p>
      )}

      <p className="mt-5 text-center text-[11px] leading-relaxed text-bone-500">
        This goes straight to Nex Desk and nowhere else. It is not published anywhere and is
        used only to set up your account.
      </p>
    </div>
  );
}
