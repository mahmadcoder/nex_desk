"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";
import { changeClientPassword } from "@/lib/actions/portal";

export default function ClientPasswordForm() {
  const [pending, start] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    start(async () => {
      const res = await changeClientPassword({
        currentPassword,
        newPassword,
      });

      if (!res.ok) {
        toast.error(res.error || "Could not update password.");
        return;
      }

      toast.success("Password updated successfully.");
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <section className="card border-ink-600 p-5 sm:p-6">
      <div className="flex items-center gap-2.5 border-b border-ink-700 pb-3">
        <KeyRound className="h-4 w-4 text-lime-400" />
        <div>
          <h2 className="text-base font-semibold text-bone-50">Change Password</h2>
          <p className="text-xs text-bone-400">
            Keep your portal account secure by choosing a strong password.
          </p>
        </div>
      </div>

      {success ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-lime-400/25 bg-lime-400/[0.06] p-4 text-xs text-lime-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-lime-400" />
            <span>Your password has been changed. Use your new password next time you sign in.</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mono-tag text-[11px] text-lime-400 underline hover:text-lime-300"
          >
            Change again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-w-lg">
          <div>
            <label className="mono-tag mb-1.5 block text-xs text-bone-300">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 pr-10 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-400 hover:text-bone-200"
                tabIndex={-1}
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block text-xs text-bone-300">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 pr-10 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-400 hover:text-bone-200"
                  tabIndex={-1}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mono-tag mb-1.5 block text-xs text-bone-300">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 pr-10 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none"
                  placeholder="Repeat new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-400 hover:text-bone-200"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={pending || !currentPassword || !newPassword || !confirmPassword}
              className="btn btn-primary btn-sm gap-2"
            >
              <Lock size={13} />
              {pending ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
