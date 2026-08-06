"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import StatusControl from "@/components/admin/StatusControl";
import { KeyRound, Copy, Send, Eye, EyeOff, FileDown } from "lucide-react";
import { sendEmployeeCredentials } from "@/lib/actions/cms";
import { getSiteBaseUrl, adminPath } from "@/lib/utils";

/**
 * Staff panel access for one employee: shows the current credentials and
 * re-sends them. The send can fail independently of the account existing, so
 * the result is always reported rather than assumed.
 */
export default function EmployeeAccessCard({
  employee,
}: {
  employee: {
    id: string;
    full_name: string;
    email: string;
    user_id: string | null;
    /** Active | On Leave | Terminated — whether they may sign in at all. */
    status?: string | null;
    portal_password_preview: string | null;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reveal, setReveal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loginUrl = `${getSiteBaseUrl()}${adminPath("/login")}`;
  const hasAccount = !!employee.user_id;

  const copyCredentials = () => {
    navigator.clipboard.writeText(
      `Nex Desk staff panel\nURL: ${loginUrl}\nEmail: ${employee.email}\nPassword: ${
        employee.portal_password_preview || "(not generated yet)"
      }`
    );
    toast.success("Credentials copied.");
  };

  const resend = () => {
    start(async () => {
      try {
        const res = await sendEmployeeCredentials(employee.id);
        if (res.ok) {
          toast.success(
            res.offerAttached
              ? `Login details and offer letter sent to ${employee.email}.`
              : `Login details sent to ${employee.email}, but the offer letter could not be built.`
          );
        } else {
          toast.error(res.error || "Could not send the login details.");
        }
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "Could not send the login details.");
      }
    });
  };

  /**
   * The offer letter is streamed straight back as a PDF, not stored — so this
   * downloads the response rather than following a URL.
   */
  const downloadOffer = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/staff-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "offer_letter", id: employee.id }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        toast.error(error || "Could not build the offer letter.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Nex-Desk-Offer-Letter-${employee.full_name.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Could not build the offer letter.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card space-y-4 border-ink-600 p-6">
      <div className="flex items-center justify-between border-b border-ink-700 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <KeyRound size={16} className="text-lime-400" /> Staff Panel Access
        </h2>
        {/* This said "Account active" from !!user_id alone — a card titled
            "Staff Panel Access" reporting whether a login EXISTS, in the place
            people look for the switch that turns access off. Two separate
            facts, now shown as two. */}
        <div className="flex items-center gap-2">
          <span
            className={`mono-tag rounded-full border px-2.5 py-0.5 text-[10px] ${
              hasAccount
                ? "border-ink-600 bg-ink-800 text-bone-300"
                : "border-amber-400/20 bg-amber-400/10 text-amber-400"
            }`}
          >
            {hasAccount ? "Login created" : "No login yet"}
          </span>
          <StatusControl
            employeeId={employee.id}
            name={employee.full_name}
            status={employee.status ?? "Active"}
          />
        </div>
      </div>

      <div className="space-y-2.5 text-xs">
        <div>
          <span className="mono-tag mb-1 block text-[10px]">Sign-in URL</span>
          <p className="break-all font-mono text-bone-100">{loginUrl}</p>
        </div>
        <div>
          <span className="mono-tag mb-1 block text-[10px]">Email</span>
          <p className="break-all font-mono text-bone-100">{employee.email}</p>
        </div>
        <div>
          <span className="mono-tag mb-1 block text-[10px]">Password</span>
          <div className="flex items-center gap-2">
            <p className="font-mono text-bone-100">
              {employee.portal_password_preview
                ? reveal
                  ? employee.portal_password_preview
                  : "•".repeat(employee.portal_password_preview.length)
                : hasAccount
                  ? "Hidden — reset to issue a new one"
                  : "Not generated yet"}
            </p>
            {employee.portal_password_preview && (
              <button
                onClick={() => setReveal((v) => !v)}
                className="text-bone-400 transition-colors hover:text-lime-400"
                aria-label={reveal ? "Hide password" : "Show password"}
              >
                {reveal ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
        <button onClick={copyCredentials} className="btn h-8 px-3 text-xs">
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
        </button>
        <button onClick={downloadOffer} disabled={downloading} className="btn h-8 px-3 text-xs">
          <FileDown className="mr-1.5 h-3.5 w-3.5" />
          {downloading ? "Building…" : "Offer letter"}
        </button>
        <button onClick={resend} disabled={pending} className="btn btn-primary h-8 px-3 text-xs">
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {pending ? "Sending…" : hasAccount ? "Resend login & offer letter" : "Create login & send"}
        </button>
      </div>

      {hasAccount && !employee.portal_password_preview && (
        <p className="rounded-lg border border-ink-600 bg-ink-900/60 p-2.5 text-[11px] leading-relaxed text-bone-300">
          The stored copy of this password expired and has been discarded — it is only kept
          for 72 hours after it is issued. Their login still works; use the button above to
          issue and email a new one.
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-bone-400">
        Sending the login details also attaches the offer letter, built live from this
        employee&rsquo;s salary, role and start date. Staff sign in to the same control panel
        and see only their assigned clients, projects and the daily work log.
      </p>
    </div>
  );
}
