"use client";
import { useState } from "react";
import { toast } from "sonner";

const field = "w-full rounded-lg border border-ink-500 bg-ink-800 px-4 py-3 text-sm focus:border-lime-400 focus:outline-none";

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!email.includes("@")) return toast.error("Enter the email address we invoice.");
    setBusy(true);
    try {
      await fetch("/api/portal-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      {sent ? (
        <div className="card p-8 text-center">
          <p className="drawer-label justify-center">Check your inbox</p>
          <h1 className="mt-5 text-2xl">Link sent</h1>
          <p className="mt-3 text-sm text-bone-400">
            If {email} is on one of our projects, a one-time sign-in link is on its way.
            It expires in an hour.
          </p>
        </div>
      ) : (
        <div className="card p-8">
          <h1 className="text-2xl">Sign in</h1>
          <p className="mt-2 text-sm text-bone-400">
            No password. Enter the email we invoice and we&apos;ll send a one-time link.
          </p>
          <input
            className={`${field} mt-6`}
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn btn-primary mt-4 w-full justify-center" onClick={send} disabled={busy}>
            {busy ? "Sending…" : "Send me a link"}
          </button>
        </div>
      )}
    </div>
  );
}
