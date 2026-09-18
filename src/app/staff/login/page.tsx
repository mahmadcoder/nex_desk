"use client";

import { useActionState, useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { signIn } from "@/lib/actions";
import { getStaffLoginGreeting, type StaffLoginGreeting } from "@/lib/actions/staffAuth";
import { LogoMark } from "@/components/brand/Logo";
import {
  Eye,
  EyeOff,
  Users,
  Sparkles,
  Clock,
  Briefcase,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

const REMEMBER_STAFF_KEY = "nx_staff_visitor";

interface StoredStaffVisitor {
  email: string;
  name: string;
  firstName: string;
  jobTitle?: string;
  avatarUrl?: string | null;
  department?: string;
}

function readStoredStaff(): StoredStaffVisitor | null {
  try {
    const raw = localStorage.getItem(REMEMBER_STAFF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistStaffVisitor(visitor: StoredStaffVisitor) {
  try {
    localStorage.setItem(REMEMBER_STAFF_KEY, JSON.stringify(visitor));
  } catch {
    /* private browsing */
  }
}

function clearStoredStaff() {
  try {
    localStorage.removeItem(REMEMBER_STAFF_KEY);
  } catch {
    /* private browsing */
  }
}

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-4 py-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-violet-400 focus:outline-none transition-colors";

function StaffLoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  const [showPassword, setShowPassword] = useState(false);
  const [staffInfo, setStaffInfo] = useState<StaffLoginGreeting | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLockedEmail, setIsLockedEmail] = useState(false);

  const searchParams = useSearchParams();

  const lookupStaff = useCallback(async (emailToLookup: string) => {
    if (!emailToLookup || !emailToLookup.includes("@")) return;
    setIsLookingUp(true);
    try {
      const greeting = await getStaffLoginGreeting(emailToLookup);
      if (greeting.found) {
        setStaffInfo(greeting);
        setIsLockedEmail(true);
        if (greeting.email && greeting.name && greeting.firstName) {
          persistStaffVisitor({
            email: greeting.email,
            name: greeting.name,
            firstName: greeting.firstName,
            jobTitle: greeting.jobTitle,
            avatarUrl: greeting.avatarUrl,
            department: greeting.department,
          });
        }
      }
    } catch (e) {
      console.error("Staff lookup failed:", e);
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  useEffect(() => {
    const emailParam = searchParams.get("email");

    if (searchParams.get("logged_out") === "1") {
      toast.success("Successfully signed out.");
    }
    if (searchParams.get("deactivated") === "1") {
      toast.error("This staff account is currently inactive. Please contact your agency administrator.");
    }
    if (searchParams.get("expired") === "1") {
      toast.info("Your session has timed out. Please sign in again to continue.");
    }

    if (emailParam && emailParam.includes("@")) {
      setEmailInput(emailParam);
      lookupStaff(emailParam);
      return;
    }

    // Returning visitor on this browser
    const stored = readStoredStaff();
    if (stored && stored.email) {
      setEmailInput(stored.email);
      setStaffInfo({
        found: true,
        name: stored.name,
        firstName: stored.firstName,
        jobTitle: stored.jobTitle,
        avatarUrl: stored.avatarUrl,
        department: stored.department,
        email: stored.email,
        isActive: true,
      });
      setIsLockedEmail(true);
    }
  }, [searchParams, lookupStaff]);

  const handleEmailBlur = () => {
    if (emailInput && !staffInfo?.found) {
      lookupStaff(emailInput);
    }
  };

  const handleResetEmail = () => {
    clearStoredStaff();
    setStaffInfo(null);
    setIsLockedEmail(false);
    setEmailInput("");
  };

  const isDeactivated = searchParams.get("deactivated") === "1";
  const isExpired = searchParams.get("expired") === "1";

  return (
    <form action={action} className="card space-y-4 p-6 sm:p-7 shadow-2xl border-ink-600 bg-ink-900/95">
      {/* Session Expired Notice */}
      {isExpired && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left">
          <p className="mono-tag text-[10px] text-amber-300 font-semibold mb-0.5 flex items-center gap-1.5">
            <Clock size={12} /> Session Expired
          </p>
          <p className="text-xs text-bone-200 leading-relaxed">
            Your login session has timed out. Please enter your password to return to your workspace.
          </p>
        </div>
      )}

      {/* Deactivated Notice */}
      {isDeactivated && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3.5 text-left">
          <p className="mono-tag text-[10px] text-rose-400 font-semibold mb-1 flex items-center gap-1.5">
            <ShieldAlert size={13} /> Account Inactive
          </p>
          <p className="text-xs text-bone-200 leading-relaxed">
            This staff profile is currently marked as inactive. Access is revoked. If you believe this is an error, please reach out to your team lead.
          </p>
        </div>
      )}

      {/* ── Personalized Staff Workspace Header ── */}
      <div className="text-left border-b border-ink-800 pb-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="mono-tag inline-flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-violet-300 uppercase tracking-wider">
            <Sparkles size={11} className="text-violet-400" /> Staff Portal
          </span>
          <span className="mono-tag text-[10px] text-bone-400">Team Workspace</span>
        </div>

        {staffInfo?.found ? (
          <div className="flex items-center gap-3 mt-2">
            {staffInfo.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staffInfo.avatarUrl}
                alt={staffInfo.name || "Staff"}
                className="h-12 w-12 rounded-full object-cover border-2 border-violet-400/50 shadow-md"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 font-semibold text-white shadow-md text-base border border-violet-400/30">
                {staffInfo.firstName?.charAt(0) || "S"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-bone-50 truncate">
                Welcome, {staffInfo.name}
              </h1>
              <p className="text-xs text-violet-300/90 flex items-center gap-1.5 truncate mt-0.5">
                <Briefcase size={12} className="shrink-0 text-violet-400" />
                <span>{staffInfo.jobTitle || "Team Member"}</span>
                {staffInfo.department && (
                  <span className="text-bone-400 text-[11px]">· {staffInfo.department}</span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <h1 className="text-xl font-semibold text-bone-50">Staff Workspace Sign In</h1>
            <p className="text-xs text-bone-400 mt-1">
              Enter your agency staff credentials to access your daily tasks, schedule, and timesheets.
            </p>
          </div>
        )}
      </div>

      {/* ── Email Field ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="mono-tag block text-xs">Staff Email Address</label>
          {isLockedEmail && (
            <button
              type="button"
              onClick={handleResetEmail}
              className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCw size={10} /> Change email
            </button>
          )}
        </div>
        <div className="relative">
          <input
            name="email"
            type="email"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onBlur={handleEmailBlur}
            readOnly={isLockedEmail}
            autoComplete="username"
            className={`${field} ${
              isLockedEmail ? "bg-ink-850/80 text-bone-200 cursor-not-allowed border-ink-600" : ""
            }`}
            placeholder="you@nexdesk.agency"
          />
          {isLookingUp && (
            <div className="absolute right-3 top-3.5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* ── Password Field ── */}
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
            className="absolute right-3 top-3 text-bone-400 hover:text-bone-50 p-1 cursor-pointer"
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

      {/* ── Submit Button ── */}
      <button
        type="submit"
        className="btn w-full justify-center h-11 text-sm mt-2 cursor-pointer transition-all shadow-lg bg-violet-600 hover:bg-violet-500 text-white border border-violet-400/40 shadow-violet-900/30 font-medium"
        disabled={pending}
      >
        {pending ? (
          "Authenticating…"
        ) : (
          <span className="flex items-center gap-1.5">
            <span>Sign In to Staff Workspace</span>
            <ArrowRight size={14} />
          </span>
        )}
      </button>

      <div className="pt-2 text-center">
        <Link
          href="/nx-control/login"
          className="text-xs text-bone-400 hover:text-lime-400 transition-colors inline-flex items-center gap-1.5"
        >
          <ShieldCheck size={12} /> Agency owner or admin? Sign in here →
        </Link>
      </div>
    </form>
  );
}

export default function StaffLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink-950 px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-8 w-8 text-bone-50" />
            <div>
              <p
                className="text-xl font-semibold tracking-tight text-bone-50"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Nex Desk
              </p>
              <p className="mono-tag text-violet-400 text-[0.65rem] flex items-center gap-1">
                <Users className="h-3 w-3 inline" /> Team Workspace
              </p>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="card p-7 text-center text-xs text-bone-400">Loading staff sign in…</div>
          }
        >
          <StaffLoginForm />
        </Suspense>

        <div className="mt-6 text-center space-y-1">
          <p className="text-[11px] text-bone-500">
            Nex Desk Staff Workspace · Secure Agency Portal
          </p>
        </div>
      </div>
    </main>
  );
}
