"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Check, RefreshCw, X } from "lucide-react";
import type { AIFieldId } from "@/config/aiPrompts";

/**
 * The one AI control, placed under any long-text input.
 *
 * Reads ✨ Improve when the field has text (fix grammar, tighten wording) and
 * ✨ Suggest when it is empty (draft from the form's context). The suggestion
 * renders in a card below with Apply / Try again / Dismiss — it never touches
 * the field until Apply is pressed, so the assist is purely additive and the
 * admin stays the author.
 */
export default function AIAssist({
  field,
  getText,
  context,
  onApply,
  className,
}: {
  field: AIFieldId;
  /** Called at click time so the freshest value is sent, not a stale prop. */
  getText: () => string;
  context?: Record<string, string | null | undefined>;
  onApply: (text: string) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const ask = async () => {
    const text = getText();
    const mode = text.trim() ? "improve" : "suggest";

    setBusy(true);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          mode,
          text,
          context: Object.fromEntries(
            Object.entries(context ?? {}).filter(([, v]) => typeof v === "string" && v.trim())
          ),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "The AI assist is unavailable right now.");
        return;
      }
      setSuggestion(data.suggestion);
    } catch {
      toast.error("Could not reach the AI assist. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={ask}
        disabled={busy}
        className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-lime-400/25 bg-lime-400/[0.07] px-3 py-1.5 text-[11px] font-semibold leading-none text-lime-300 transition-colors hover:bg-lime-400/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <>
            <RefreshCw size={11} className="animate-spin" /> Thinking…
          </>
        ) : (
          <>
            <Sparkles size={11} /> {getTextSafe(getText) ? "Improve with AI" : "Suggest with AI"}
          </>
        )}
      </button>

      {suggestion && (
        <div className="mt-2 rounded-lg border border-lime-400/25 bg-ink-900/70 p-3">
          <p className="mono-tag mb-1.5 flex items-center gap-1.5 text-[10px] text-lime-300">
            <Sparkles size={10} /> Suggestion — nothing is applied until you say so
          </p>
          <p className="whitespace-pre-line text-xs leading-relaxed text-bone-100">{suggestion}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary h-7 px-3 text-[11px]"
              onClick={() => {
                onApply(suggestion);
                setSuggestion(null);
              }}
            >
              <Check size={11} className="mr-1" /> Apply
            </button>
            <button
              type="button"
              className="btn h-7 px-3 text-[11px]"
              disabled={busy}
              onClick={ask}
            >
              <RefreshCw size={11} className={`mr-1 ${busy ? "animate-spin" : ""}`} /> Try again
            </button>
            <button
              type="button"
              className="btn h-7 px-3 text-[11px]"
              onClick={() => setSuggestion(null)}
            >
              <X size={11} className="mr-1" /> Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The button label needs the current emptiness without crashing pre-mount. */
function getTextSafe(getText: () => string): boolean {
  try {
    return !!getText().trim();
  } catch {
    return false;
  }
}
