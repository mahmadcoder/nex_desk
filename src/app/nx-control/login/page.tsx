"use client";

import { useActionState, useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "@/lib/actions";
import { getStaffLoginGreeting, type StaffLoginGreeting } from "@/lib/actions/staffAuth";
import { LogoMark } from "@/components/brand/Logo";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Users,
  User,
  Sparkles,
  Clock,
  Briefcase,
  ArrowRight,
  RefreshCw,
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
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-4 py-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none transition-colors";

function AdminLoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"admin" | "staff">("admin");
  const [staffInfo, setStaffInfo] = useState<StaffLoginGreeting | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLockedEmail, setIsLockedEmail] = useState(false);

  const searchParams = useSearchParams();

  // Look up staff details safely
  const lookupStaff = useCallback(async (emailToLookup: string) => {
    if (!emailToLookup || !emailToLookup.includes("@")) return;
    setIsLookingUp(true);
    try {
      const greeting = await getStaffLoginGreeting(emailToLookup);
      if (greeting.found) {
        setStaffInfo(greeting);
        setMode("staff");
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
    // 1. Check URL parameters
    const roleParam = searchParams.get("role");
    const emailParam = searchParams.get("email");
    const staffParam = searchParams.get("staff");

    if (searchParams.get("logged_out") === "1") {
      toast.success("Successfully logged out.");
    }
    if (searchParams.get("deactivated") === "1") {
      toast.error("This staff account is currently inactive or deactivated. Please contact your administrator.");
    }
    if (searchParams.get("expired") === "1") {
      toast.info("Your session has timed out. Please sign in again to continue.");
    }

    // Explicit staff indicator in URL (from emailed links, Slack, or admin copy button)
    if (roleParam === "staff" || staffParam === "1" || (emailParam && emailParam.includes("@"))) {
      setMode("staff");
      if (emailParam) {
        setEmailInput(emailParam);
        lookupStaff(emailParam);
      }
      return;
    }

    // 2. Check local browser storage (remembers returning staff on this device)
    const stored = readStoredStaff();
    if (stored && stored.email) {
      setMode("staff");
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
    if (mode === "staff" && emailInput && !staffInfo?.found) {
      lookupStaff(emailInput);
    }
  };

  const handleSwitchToAdmin = () => {
    setMode("admin");
    setStaffInfo(null);
    setIsLockedEmail(false);
    setEmailInput("");
  };

  const handleSwitchToStaff = () => {
    setMode("staff");
    const stored = readStoredStaff();
    if (stored) {
      setEmailInput(stored.email);
      setStaffInfo({
        found: true,
        name: stored.name,
        firstName: stored.firstName,
        jobTitle: stored.jobTitle,
        avatarUrl: stored.avatarUrl,
        email: stored.email,
        isActive: true,
      });
      setIsLockedEmail(true);
    } else {
      setStaffInfo(null);
      setIsLockedEmail(false);
    }
  };

  const handleResetStaffSelection = () => {
    clearStoredStaff();
    setStaffInfo(null);
    setIsLockedEmail(false);
    setEmailInput("");
  };

  const isDeactivated = searchParams.get("deactivated") === "1";
  const isExpired = searchParams.get("expired") === "1";

  return (
    <form action={action} className="card space-y-4 p-6 sm:p-7 shadow-2xl border-ink-600 bg-ink-900/95">
      {/* ── Role Mode Switcher Pill ── */}
      <div className="grid grid-cols-2 rounded-xl bg-ink-950 p-1 border border-ink-700/80 mb-2">
        <button
          type="button"
          onClick={handleSwitchToStaff}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer ${
            mode === "staff"
              ? "bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-sm"
              : "text-bone-400 hover:text-bone-200 hover:bg-ink-800/50"
          }`}
        >
          <Users size={13} className={mode === "staff" ? "text-violet-400" : ""} />
          <span>Staff Member</span>
        </button>

        <button
          type="button"
          onClick={handleSwitchToAdmin}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer ${
            mode === "admin"
              ? "bg-ink-800 text-lime-400 border border-lime-400/30 shadow-sm"
              : "text-bone-400 hover:text-bone-200 hover:bg-ink-800/50"
          }`}
        >
          <ShieldCheck size={13} className={mode === "admin" ? "text-lime-400" : ""} />
          <span>Agency Admin</span>
        </button>
      </div>

      {/* Session Expired Notice */}
      {isExpired && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left">
          <p className="mono-tag text-[10px] text-amber-300 font-semibold mb-0.5 flex items-center gap-1.5">
            <Clock size={12} /> Session Expired
          </p>
          <p className="text-xs text-bone-200 leading-relaxed">
            Your login session has timed out. Please enter your credentials to return to your workspace.
          </p>
        </div>
      )}

      {/* Deactivated Notice */}
      {isDeactivated && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3.5 text-left">
          <p className="mono-tag text-[10px] text-rose-400 font-semibold mb-1 flex items-center gap-1.5">
            <ShieldAlert size={13} /> Account Deactivated
          </p>
          <p className="text-xs text-bone-200 leading-relaxed">
            This profile has been marked as inactive. Access is revoked. If you believe this is an error, please reach out to the agency administrator.
          </p>
        </div>
      )}

      {/* ── Personalized Staff Workspace Header ── */}
      {mode === "staff" ? (
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
                  className="h-11 w-11 rounded-full object-cover border-2 border-violet-400/50 shadow-md"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 font-semibold text-white shadow-md text-sm border border-violet-400/30">
                  {staffInfo.firstName?.charAt(0) || "S"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-semibold text-bone-50 truncate">
                  Welcome, {staffInfo.name}
                </h1>
                <p className="text-xs text-violet-300/90 flex items-center gap-1.5 truncate mt-0.5">
                  <Briefcase size={12} className="shrink-0 text-violet-400" />
                  <span>{staffInfo.jobTitle || "Staff Specialist"}</span>
                  {staffInfo.department && (
                    <span className="text-bone-400 text-[11px]">· {staffInfo.department}</span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <h1 className="text-xl font-semibold text-bone-50">Staff Member Sign In</h1>
              <p className="text-xs text-bone-400 mt-1">
                Enter your agency email and password to access your daily tasks, schedule, and timesheets.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── Agency Admin Header ── */
        <div>
          <span className="mono-tag text-xs text-lime-400 block mb-1">Agency Owner System</span>
          <h1 className="text-xl font-semibold text-bone-50">Admin &amp; Management Sign In</h1>
          <p className="text-xs text-bone-400 mt-1 mb-4">
            Enter your agency credentials to access the central administration console.
          </p>
        </div>
      )}

      {/* ── Email Field ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="mono-tag block text-xs">
            {mode === "staff" ? "Staff Email Address" : "Admin Email Address"}
          </label>
          {mode === "staff" && isLockedEmail && (
            <button
              type="button"
              onClick={handleResetStaffSelection}
              className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCw size={10} /> Not you? Switch
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
              mode === "staff"
                ? "focus:border-violet-400 selection:bg-violet-600/30"
                : "focus:border-lime-400"
            } ${isLockedEmail ? "bg-ink-850/80 text-bone-200 cursor-not-allowed border-ink-600" : ""}`}
            placeholder={mode === "staff" ? "name@nexdesk.agency" : "admin@nexdesk.com"}
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
            className={`${field} pr-10 ${
              mode === "staff"
                ? "focus:border-violet-400"
                : "focus:border-lime-400"
            }`}
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
        className={`btn w-full justify-center h-11 text-sm mt-2 cursor-pointer transition-all shadow-lg ${
          mode === "staff"
            ? "bg-violet-600 hover:bg-violet-500 text-white border border-violet-400/40 shadow-violet-900/30 font-medium"
            : "btn-primary font-medium"
        }`}
        disabled={pending}
      >
        {pending ? (
          "Authenticating…"
        ) : mode === "staff" ? (
          <span className="flex items-center gap-1.5">
            <span>Sign In to Staff Workspace</span>
            <ArrowRight size={14} />
          </span>
        ) : (
          <span>Sign In to Control Center →</span>
        )}
      </button>

      {/* ── Bottom Switch Link ── */}
      <div className="pt-2 text-center text-xs">
        {mode === "staff" ? (
          <button
            type="button"
            onClick={handleSwitchToAdmin}
            className="text-bone-400 hover:text-lime-400 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <ShieldCheck size={12} /> Are you an agency owner or admin? Sign in here
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSwitchToStaff}
            className="text-bone-400 hover:text-violet-400 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <User size={12} /> Team member? Access Staff Workspace
          </button>
        )}
      </div>
    </form>
  );
}

export default function AdminLogin() {
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
              <p className="mono-tag text-lime-400 text-[0.65rem] flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 inline" /> Agency Operations Hub
              </p>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="card p-7 text-center text-xs text-bone-400">Loading sign in form…</div>
          }
        >
          <AdminLoginForm />
        </Suspense>

        <div className="mt-6 text-center space-y-1">
          <p className="text-[11px] text-bone-500">
            Nex Desk Agency Console · Encrypted Authentication
          </p>
        </div>
      </div>
    </main>
  );
}
