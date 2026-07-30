"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Copy, Send, Eye, EyeOff } from "lucide-react";
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
    portal_password_preview: string | null;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reveal, setReveal] = useState(false);

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
          toast.success(`Login details sent to ${employee.email}.`);
        } else {
          toast.error(res.error || "Could not send the login details.");
        }
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "Could not send the login details.");
      }
    });
  };

  return (
    <div className="card space-y-4 border-ink-600 p-6">
      <div className="flex items-center justify-between border-b border-ink-700 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <KeyRound size={16} className="text-lime-400" /> Staff Panel Access
        </h2>
        <span
          className={`mono-tag rounded-full border px-2.5 py-0.5 text-[10px] ${
            hasAccount
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
              : "border-amber-400/20 bg-amber-400/10 text-amber-400"
          }`}
        >
          {hasAccount ? "Account active" : "No login yet"}
        </span>
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
        <button onClick={resend} disabled={pending} className="btn btn-primary h-8 px-3 text-xs">
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {pending ? "Sending…" : hasAccount ? "Resend login details" : "Create login & send"}
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-bone-400">
        Staff sign in to the same control panel and see only their assigned clients,
        projects and the daily work log.
      </p>
    </div>
  );
}
