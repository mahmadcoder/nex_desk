"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/actions";
import { LogoMark } from "@/components/brand/Logo";
import { Eye, EyeOff, ShieldCheck, Clock } from "lucide-react";

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-4 py-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none transition-colors";

function AdminLoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";

  return (
    <form action={action} className="card space-y-4 p-7 shadow-2xl border-ink-600">
      <div>
        <span className="mono-tag text-xs text-lime-400 block mb-1">Agency Owner System</span>
        <h1 className="text-xl font-semibold text-bone-50">Admin Sign In</h1>
        <p className="text-xs text-bone-400 mt-1 mb-4">
          Enter your master administrator credentials to access the agency console.
        </p>
      </div>

      {/* Session Expired Security Banner */}
      {isExpired && (
        <div className="rounded-lg bg-amber-400/10 border border-amber-400/30 px-3.5 py-2.5 text-xs text-amber-300 flex items-start gap-2">
          <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-400">Admin Session Expired</p>
            <p className="mt-0.5 text-bone-300">
              For your security, admin sessions expire after 24 hours. Please sign in again.
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="mono-tag block text-xs mb-1.5">Email Address</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className={field}
          placeholder="admin@nexdesk.com"
        />
      </div>

      <div>
        <label className="mono-tag block text-xs mb-1.5">Password</label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${field} pr-10`}
            placeholder="••••••••••••"
          />
          <button
            type="button"
            className="absolute right-3 top-3 text-bone-400 hover:text-bone-50 p-1"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-[#F87171]/10 px-3 py-2 text-sm text-[#F87171]">{state.error}</p>
      )}

      <button className="btn btn-primary w-full justify-center h-11 text-sm mt-2" disabled={pending}>
        {pending ? "Authenticating…" : "Sign In to Control Center →"}
      </button>
    </form>
  );
}

export default function AdminLogin() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-8 w-8 text-bone-50" />
            <div>
              <p className="text-xl font-semibold tracking-tight text-bone-50" style={{ fontFamily: "var(--font-display)" }}>
                Nex Desk
              </p>
              <p className="mono-tag text-lime-400 text-[0.65rem] flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 inline" /> Main Control Center
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="card p-7 text-center text-xs text-bone-400">Loading form…</div>}>
          <AdminLoginForm />
        </Suspense>

        <div className="mt-6 text-center space-y-1">
          <p className="mono-tag text-xs text-bone-400">⚡ 24-Hour Security Auto-Logout Protected</p>
          <p className="text-[11px] text-bone-500">Restricted Access · All login attempts logged</p>
        </div>
      </div>
    </main>
  );
}
