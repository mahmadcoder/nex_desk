"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Eye, EyeOff } from "lucide-react";

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-4 py-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none transition-colors";

export default function PortalLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const queryEmail = searchParams.get("email");
    if (queryEmail) setEmail(queryEmail);
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return toast.error("Please enter your registered email address.");
    if (!password) return toast.error("Please enter your portal password.");

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        toast.error("Invalid email or password. Please check the credentials provided in your welcome email.");
      } else {
        toast.success("Welcome to your Client Portal!");
        router.push("/portal");
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred during login.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16 px-4">
      <div className="flex justify-center mb-8">
        <Logo />
      </div>

      <div className="card p-8">
        <div className="mb-6">
          <p className="mono-tag text-lime-400">Client Portal</p>
          <h1 className="mt-2 text-2xl font-semibold text-bone-50">Client Sign In</h1>
          <p className="mt-1 text-sm text-bone-400">
            Enter the login credentials sent to your email upon locking your project.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block text-xs">Email Address</label>
            <input
              className={field}
              type="email"
              placeholder="client@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mono-tag mb-1.5 block text-xs">Portal Password</label>
            <div className="relative">
              <input
                className={`${field} pr-10`}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

          <button
            type="submit"
            className="btn btn-primary mt-6 w-full justify-center h-11"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign In to Portal →"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-bone-500">
          Need help logging in? Contact your Nex Desk project lead.
        </p>
      </div>
    </div>
  );
}
