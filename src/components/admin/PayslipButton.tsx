"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";

/**
 * Downloads a payslip.
 *
 * The PDF is streamed from `/api/staff-doc` rather than stored, so it always
 * reflects the payment row as it stands now — correct a bonus and the payslip
 * corrects with it, instead of a stale file sitting in a bucket.
 *
 * The route decides who may fetch which one: admin for anyone, staff for their
 * own. Nothing here is trusted for that.
 */
export default function PayslipButton({ paymentId }: { paymentId: string }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/staff-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "payslip", id: paymentId }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || "Could not build that payslip.");
      }

      // Blob rather than a link: the endpoint is a POST, and revoking the URL
      // afterwards stops the buffer being held for the life of the page.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "payslip.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build that payslip.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={download} disabled={busy} className="btn btn-sm gap-1.5">
      {busy ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
      Payslip
    </button>
  );
}
