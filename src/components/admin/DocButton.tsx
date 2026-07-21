"use client";
import { useState } from "react";
import { toast } from "sonner";
import type { DocType } from "@/lib/pdf/generate";

/** Generates a PDF on demand and opens the signed download link. */
export default function DocButton({
  type, id, label, primary,
}: { type: DocType; id: string; label: string; primary?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(data.url, "_blank");
      toast.success("Document ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build that document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={go} disabled={busy}
      className={`btn h-8 px-3 text-xs ${primary ? "btn-primary" : ""}`}>
      {busy ? "Building…" : label}
    </button>
  );
}
