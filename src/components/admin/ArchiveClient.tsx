"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Building2, User, Mail, Calendar, Phone } from "lucide-react";
import { restoreClient } from "@/lib/actions";
import { restoreEmployee } from "@/lib/actions/cms";
import { fmtDate } from "@/lib/datetime";

import ConfirmModal from "@/components/admin/ConfirmModal";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ArchiveClient({
  clients = [],
  employees = [],
  defaultTab = "clients",
}: {
  clients: any[];
  employees: any[];
  defaultTab?: "clients" | "employees";
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"clients" | "employees">(defaultTab);
  const [search, setSearch] = useState("");
  const [pending, start] = useTransition();

  const [restoringClient, setRestoringClient] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [notifyClientEmail, setNotifyClientEmail] = useState(true);

  const [restoringStaff, setRestoringStaff] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [notifyStaffEmail, setNotifyStaffEmail] = useState(true);

  const filteredClients = clients.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.job_title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirmRestoreClient = () => {
    if (!restoringClient) return;
    start(async () => {
      const res = await restoreClient(restoringClient.id, { sendEmail: notifyClientEmail });
      if (res?.success) {
        toast.success(
          res.emailSent
            ? `Client "${restoringClient.name}" reactivated. Welcome-back email sent.`
            : `Client "${restoringClient.name}" has been restored to active status.`
        );
        setRestoringClient(null);
        router.refresh();
      } else {
        toast.error("Could not restore client.");
      }
    });
  };

  const handleConfirmRestoreEmployee = () => {
    if (!restoringStaff) return;
    start(async () => {
      const res = await restoreEmployee(restoringStaff.id, { sendEmail: notifyStaffEmail });
      if (res?.success) {
        toast.success(
          res.emailSent
            ? `Staff member "${restoringStaff.name}" reactivated. Welcome-back email sent.`
            : `Staff member "${restoringStaff.name}" has been restored to active status.`
        );
        setRestoringStaff(null);
        router.refresh();
      } else {
        toast.error("Could not restore staff member.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("clients")}
            className={`mono-tag inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer ${
              tab === "clients"
                ? "bg-lime-400/10 text-lime-400 font-semibold border border-lime-400/30"
                : "text-bone-400 hover:text-bone-100 hover:bg-ink-800"
            }`}
          >
            <Building2 size={13} />
            Archived Clients ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("employees")}
            className={`mono-tag inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer ${
              tab === "employees"
                ? "bg-lime-400/10 text-lime-400 font-semibold border border-lime-400/30"
                : "text-bone-400 hover:text-bone-100 hover:bg-ink-800"
            }`}
          >
            <User size={13} />
            Inactive / Past Staff ({employees.length})
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${tab}...`}
          className="w-full sm:w-64 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none"
        />
      </div>

      {/* Clients List */}
      {tab === "clients" && (
        <>
          {!filteredClients.length ? (
            <div className="card p-10 text-center text-sm text-bone-400">
              No archived clients found.
            </div>
          ) : (
            <div className="card divide-y divide-ink-600">
              {filteredClients.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-ink-800/30 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-bone-100 text-sm">{c.name}</p>
                      {c.company && (
                        <span className="mono-tag text-[10px] text-bone-400">• {c.company}</span>
                      )}
                      <span className="mono-tag text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                        Archived
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-bone-400">
                      {c.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} /> {c.phone}
                        </span>
                      )}
                      {c.created_at && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} /> Added {fmtDate(c.created_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setNotifyClientEmail(true);
                      setRestoringClient({ id: c.id, name: c.name, email: c.email });
                    }}
                    className="btn btn-sm gap-1.5 border-lime-400/40 text-lime-300 hover:bg-lime-400/10 cursor-pointer"
                    title="Restore client back to active status"
                  >
                    <RotateCcw size={13} /> Reactivate Client
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Employees List */}
      {tab === "employees" && (
        <>
          {!filteredEmployees.length ? (
            <div className="card p-10 text-center text-sm text-bone-400">
              No inactive or past staff members found.
            </div>
          ) : (
            <div className="card divide-y divide-ink-600">
              {filteredEmployees.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-ink-800/30 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-bone-100 text-sm">{e.full_name}</p>
                      {e.job_title && (
                        <span className="mono-tag text-[10px] text-bone-400">• {e.job_title}</span>
                      )}
                      <span className="mono-tag text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        Inactive / Past Staff
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-bone-400">
                      {e.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} /> {e.email}
                        </span>
                      )}
                      {e.created_at && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} /> Joined {fmtDate(e.created_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setNotifyStaffEmail(true);
                      setRestoringStaff({ id: e.id, name: e.full_name, email: e.email });
                    }}
                    className="btn btn-sm gap-1.5 border-lime-400/40 text-lime-300 hover:bg-lime-400/10 cursor-pointer"
                    title="Restore staff member back to active status"
                  >
                    <RotateCcw size={13} /> Reactivate Staff
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Restore Client Confirmation Modal */}
      <ConfirmModal
        isOpen={!!restoringClient}
        title={`Reactivate Client — ${restoringClient?.name}`}
        description={`This will restore ${restoringClient?.name} to active status, reopen their portal login, and make their projects visible in the agency directory.`}
        confirmText="Reactivate Client"
        isDanger={false}
        pending={pending}
        onConfirm={handleConfirmRestoreClient}
        onClose={() => setRestoringClient(null)}
      >
        <div className="rounded-lg border border-ink-600 bg-ink-800/80 p-3 text-left">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-bone-200">
            <input
              type="checkbox"
              checked={notifyClientEmail}
              onChange={(e) => setNotifyClientEmail(e.target.checked)}
              className="h-4 w-4 rounded border-ink-500 bg-ink-900 text-lime-400 focus:ring-lime-400 cursor-pointer"
            />
            <span className="font-medium">Send welcome-back email notification to client</span>
          </label>
          <p className="mt-1 text-[11px] text-bone-400 pl-6.5">
            Notifies {restoringClient?.email || "the client"} that their portal is active and their account is restored.
          </p>
        </div>
      </ConfirmModal>

      {/* Restore Staff Confirmation Modal */}
      <ConfirmModal
        isOpen={!!restoringStaff}
        title={`Reactivate Staff Member — ${restoringStaff?.name}`}
        description={`This will restore ${restoringStaff?.name} to active status and restore their access to the agency control center.`}
        confirmText="Reactivate Staff"
        isDanger={false}
        pending={pending}
        onConfirm={handleConfirmRestoreEmployee}
        onClose={() => setRestoringStaff(null)}
      >
        <div className="rounded-lg border border-ink-600 bg-ink-800/80 p-3 text-left">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-bone-200">
            <input
              type="checkbox"
              checked={notifyStaffEmail}
              onChange={(e) => setNotifyStaffEmail(e.target.checked)}
              className="h-4 w-4 rounded border-ink-500 bg-ink-900 text-lime-400 focus:ring-lime-400 cursor-pointer"
            />
            <span className="font-medium">Send welcome-back email notification to employee</span>
          </label>
          <p className="mt-1 text-[11px] text-bone-400 pl-6.5">
            Notifies {restoringStaff?.email || "the staff member"} that their staff account and credentials have been reactivated.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}
