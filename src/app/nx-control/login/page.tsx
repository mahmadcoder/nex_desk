"use client";
import { useActionState } from "react";
import { signIn } from "@/lib/actions";
import { LogoMark } from "@/components/brand/Logo";

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-4 py-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <main className="grid min-h-screen place-items-center bg-ink-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-3">
          <LogoMark className="h-8 w-8 text-bone-50" />
          <div>
            <p className="text-lg tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Nex Desk</p>
            <p className="mono-tag text-[0.625rem]">control panel</p>
          </div>
        </div>

        <form action={action} className="card space-y-4 p-7">
          <div>
            <label className="mono-tag">Email</label>
            <input name="email" type="email" required autoComplete="username" className={`${field} mt-2`} />
          </div>
          <div>
            <label className="mono-tag">Password</label>
            <input name="password" type="password" required autoComplete="current-password" className={`${field} mt-2`} placeholder="••••••••••" />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-[#F87171]/10 px-3 py-2 text-sm text-[#F87171]">{state.error}</p>
          )}

          <button className="btn btn-primary w-full justify-center" disabled={pending}>
            {pending ? "Checking…" : "Sign in"}
          </button>
        </form>

        <p className="mono-tag mt-6 text-center">staff accounts only</p>
      </div>
    </main>
  );
}
