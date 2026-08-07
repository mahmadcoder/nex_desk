"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

/**
 * "Want it in your inbox?" at the bottom of the checklist.
 *
 * Deliberately at the BOTTOM and deliberately optional — the checklist itself
 * is ungated. A wall in front of a list from an agency a stranger has not heard
 * of gets abandoned, and the goodwill is the whole point of publishing it.
 *
 * Posts to the same `/api/subscribe` the footer uses.
 */
export default function ChecklistSubscribe() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscription failed");
      setDone(true);
      setEmail("");
      toast.success("Sent. Check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not subscribe. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm text-lime-300">
        <Check size={15} /> On its way. We send one short email a month and nothing else.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2.5">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        aria-label="Email address"
        className="min-w-0 flex-1 rounded-full border border-ink-600 bg-ink-900/80 px-4 py-2.5 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none"
      />
      <button type="submit" disabled={loading} className="btn btn-primary shrink-0">
        {loading ? <Loader2 size={15} className="animate-spin" /> : "Send it to me"}
      </button>
    </form>
  );
}
