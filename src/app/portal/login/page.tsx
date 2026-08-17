"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { getPortalGreeting, recordPortalLogin, verifyClientCanLogin } from "@/lib/actions";
import { Eye, EyeOff, Check, ShieldAlert } from "lucide-react";

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
  const [deactivatedClientInfo, setDeactivatedClientInfo] = useState<{
    name?: string;
    company?: string;
  } | null>(null);
  const [isDeactivatedParam, setIsDeactivatedParam] = useState(false);

  useEffect(() => {
    if (searchParams.get("deactivated") === "1") {
      setIsDeactivatedParam(true);
    }

    const queryKey = searchParams.get("key");
    if (queryKey) {
      // The link came from us, so we already know who we sent it to — greet
      // them by name and fill the address in rather than making them type it.
      getPortalGreeting(queryKey).then((who: any) => {
        if (!who) return;
        if (who.deactivated) {
          setDeactivatedClientInfo({
            name: who.name || who.firstName,
            company: who.company,
          });
          return;
        }
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
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return toast.error("Enter the email address we sent your invite to.");
    if (!password) return toast.error("Enter your portal password.");

    setBusy(true);
    try {
      // 1. Verify client is active in agency records
      const check = await verifyClientCanLogin(email.trim());
      if (check.deactivated) {
        const supabase = createClient();
        await supabase.auth.signOut();
        setDeactivatedClientInfo({
          name: check.clientName || "",
          company: check.company || "",
        });
        return;
      }

      // 2. Authenticate with Supabase
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

  if (deactivatedClientInfo || isDeactivatedParam) {
    return (
      <div className="card p-8 border-rose-500/30 bg-rose-500/[0.04] text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <span className="mono-tag text-xs text-rose-400 font-semibold uppercase tracking-wider">
          Account Inactive / Archived
        </span>
        <h1 className="mt-2 text-2xl font-bold text-bone-50">
          Client Portal Access Suspended
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-bone-300">
          The portal account for <strong className="text-bone-100">{deactivatedClientInfo?.company || deactivatedClientInfo?.name || "this client"}</strong> is no longer active or has been archived by the agency.
        </p>

        <div className="mt-6 rounded-lg border border-ink-600 bg-ink-800/80 p-4 text-left">
          <p className="mono-tag text-[10px] text-lime-400 font-semibold mb-1">What to do next:</p>
          <ul className="text-xs text-bone-300 space-y-1.5 list-disc list-inside">
            <li>If you are an active client and believe this is an error, please contact your Nex Desk account manager.</li>
            <li>If you require copies of past agreements, receipts, or deliverables, reach out to our team.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn btn-secondary text-xs">
            Return to Homepage
          </Link>
          <button
            type="button"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              setDeactivatedClientInfo(null);
              setIsDeactivatedParam(false);
              router.push("/portal/login");
            }}
            className="btn btn-primary text-xs cursor-pointer"
          >
            Sign in with another account
          </button>
        </div>
      </div>
    );
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
