"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Check } from "lucide-react";

import { getPortalGreeting, recordPortalLogin } from "@/lib/actions";

/**
 * Who signed in here last, remembered on this device only.
 *
 * Before sign-in the server has no way to know who is at the keyboard unless
 * they arrived from an emailed link, so a returning visitor typing the URL
 * directly would get an anonymous greeting. This is presentation only — a name
 * and a flag, never a credential.
 */
const REMEMBER_KEY = "nx_portal_visitor";

function readVisitor(): { firstName: string | null; seen: boolean } {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    return raw ? JSON.parse(raw) : { firstName: null, seen: false };
  } catch {
    return { firstName: null, seen: false };
  }
}

function rememberVisitor(firstName: string | null) {
  try {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ firstName, seen: true }));
  } catch {
    /* private browsing — the greeting is simply less personal */
  }
}

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-4 py-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none transition-colors";

const PROMISES = [
  "Live progress, updated as the work happens",
  "Every agreement, invoice and receipt to download",
  "Request a change and get it priced before we start",
];

function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    const queryKey = searchParams.get("key");
    if (queryKey) {
      // The link came from us, so we already know who we sent it to — greet
      // them by name and fill the address in rather than making them type it.
      getPortalGreeting(queryKey).then((who) => {
        if (!who) return;
        setEmail(who.email);
        setFirstName(who.firstName);
        setReturning(!who.isFirstTime);
      });
    } else {
      const queryEmail = searchParams.get("email");
      if (queryEmail) setEmail(queryEmail);

      // No token: fall back to whoever signed in on this device last.
      const visitor = readVisitor();
      if (visitor.firstName) setFirstName(visitor.firstName);
      if (visitor.seen) setReturning(true);
    }

    if (searchParams.get("logged_out") === "1") {
      toast.success("Signed out. See you soon.");
    }
    if (searchParams.get("deactivated") === "1") {
      toast.error("This portal account is currently inactive or archived. Please contact your account manager.");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return toast.error("Enter the email address we sent your invite to.");
    if (!password) return toast.error("Enter your portal password.");

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error("That email and password don't match. Check the welcome email we sent you.");
      } else {
        // Counted here, once, on a real sign-in — not on every page view.
        const visit = await recordPortalLogin().catch(() => null);
        rememberVisitor(visit?.firstName ?? firstName);
        router.push("/portal");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong signing you in. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="mono-tag text-lime-400">Client portal</p>
        {/* Named when they arrive from the emailed link; a plain welcome
            otherwise, rather than a greeting addressed to nobody. */}
        <h1 className="mt-2 text-2xl leading-tight font-semibold text-bone-50">
          {firstName
            ? returning
              ? `Welcome back, ${firstName}.`
              : `Welcome, ${firstName}.`
            : returning
              ? "Welcome back."
              : "Welcome."}
        </h1>
        <p className="mt-1.5 text-xs text-bone-300">
          {returning
            ? "Sign in to pick up where you left off."
            : "Use the password from your welcome email to get started."}
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mono-tag mb-1.5 block text-xs">Email address</label>
          <input
            className={field}
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mono-tag mb-1.5 block text-xs">Password</label>
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
              className="absolute right-3 top-3 p-1 text-bone-400 hover:text-bone-50"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary mt-2 h-11 w-full justify-center" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

export default function PortalLogin() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-10">
      {/* Two columns on desktop: the pitch lives beside the card, not inside
          it, so the form stays short enough to sign in without scrolling.
          Stacks to just the card on a phone — nobody reads a value
          proposition on the way to a password. */}
      <div className="grid w-full max-w-4xl items-center gap-10 lg:grid-cols-[1fr_400px]">
        <div className="hidden lg:block">
          <p className="drawer-label">Nex Desk</p>
          <h2 className="mt-6 text-4xl leading-tight font-semibold text-bone-50">
            Everything about your project,
            <br />
            in one place.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-bone-300">
            No chasing for updates, no digging through email threads for an invoice. It is all
            here, and it is current.
          </p>

          <ul className="mt-7 space-y-3">
            {PROMISES.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm leading-relaxed text-bone-200">
                <Check size={15} strokeWidth={2.5} aria-hidden className="mt-[3px] shrink-0 text-lime-400" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-sm lg:mx-0">
          <div className="card border-ink-600 p-6 shadow-2xl sm:p-7">
            <Suspense
              fallback={<div className="py-10 text-center text-xs text-bone-300">Loading…</div>}
            >
              <PortalLoginForm />
            </Suspense>
          </div>

          <p className="mt-4 text-center text-[11px] text-bone-300">
            Trouble signing in? Reply to any email from us and we&rsquo;ll sort it.
          </p>
        </div>
      </div>
    </div>
  );
}
