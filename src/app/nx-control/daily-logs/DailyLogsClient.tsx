"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitDailyWorkLog, deleteDailyWorkLog } from "@/lib/actions/cms";
import { PageHead } from "@/components/admin/ui";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect, { SelectOption } from "@/components/ui/CustomSelect";
import { IDailyWorkLog } from "@/types/cms";
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sun,
  User,
  Folder,
  X,
} from "lucide-react";

interface DailyLogsClientProps {
  initialLogs: IDailyWorkLog[];
  employeesList: { id: string; name: string }[];
  projectsList: { id: string; title: string }[];
}

export default function DailyLogsClient({
  initialLogs,
  employeesList,
  projectsList,
}: DailyLogsClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [logs, setLogs] = useState<IDailyWorkLog[]>(initialLogs);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeesList[0]?.id || "");
  const [selectedProjectId, setSelectedProjectId] = useState(projectsList[0]?.id || "");
  const [workDate, setWorkDate] = useState(todayStr);
  const [hoursSpent, setHoursSpent] = useState("7.5");
  const [tasksCompleted, setTasksCompleted] = useState("");
  const [blockers, setBlockers] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [shareWithClient, setShareWithClient] = useState(true);
  const [progressDelta, setProgressDelta] = useState("0");

  // Check if selected workDate or Today is Sunday
  const isSundayDate = useMemo(() => {
    const d = new Date(workDate + "T00:00:00");
    return d.getDay() === 0; // 0 = Sunday
  }, [workDate]);

  // Options for CustomSelect
  const employeeOptions: SelectOption[] = employeesList.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const projectOptions: SelectOption[] = projectsList.map((p) => ({
    value: p.id,
    label: p.title,
  }));

  const handleSaveLog = () => {
    if (!tasksCompleted.trim()) {
      toast.error("Please describe tasks completed today.");
      return;
    }

    const empObj = employeesList.find((e) => e.id === selectedEmployeeId);
    const projObj = projectsList.find((p) => p.id === selectedProjectId);

    if (!empObj) {
      toast.error("Select the employee this log belongs to.");
      return;
    }

    startTransition(async () => {
      try {
        await submitDailyWorkLog({
          employee_id: empObj.id,
          employee_name: empObj.name,
          project_id: projObj?.id ?? null,
          project_title: projObj?.title || "General Agency Work",
          work_date: workDate,
          hours_spent: parseFloat(hoursSpent) || 0,
          tasks_completed: tasksCompleted,
          blockers: blockers || null,
          proof_url: proofUrl || null,
          client_visible: shareWithClient && !!projObj,
          progress_delta: Number(progressDelta) || 0,
        });

        toast.success(
          shareWithClient && projObj
            ? "Work log submitted and shared with the client."
            : "Work log submitted."
        );
        setShowAddModal(false);
        setTasksCompleted("");
        setBlockers("");
        setProofUrl("");
        setProgressDelta("0");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit work log.");
      }
    });
  };

  const handleDeleteLog = () => {
    if (!deletingId) return;
    const targetId = deletingId;
    startTransition(async () => {
      try {
        await deleteDailyWorkLog(targetId);
        toast.success("Daily log deleted.");
        setDeletingId(null);
        router.refresh();
      } catch {
        toast.error("Failed to delete daily log.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={`Staff Daily Work Logs (${logs.length})`}
        sub="Employee daily task reports, hours logged, assigned project updates, and blockers."
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus size={14} /> Submit Daily Work Log
          </button>
        }
      />

      {/* Sunday Off Notice Banner */}
      <div className="card p-4 bg-amber-500/10 border-amber-500/30 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Sun size={20} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-amber-300">Sunday Rest Day Policy</h4>
          <p className="text-[11px] text-bone-300">
            Sunday is an official agency non-working day (Sunday Off). Employees are encouraged to rest. Work logged on Sundays is optional.
          </p>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="space-y-4">
        {logs.map((log) => {
          const logDateObj = new Date(log.work_date + "T00:00:00");
          const isSun = logDateObj.getDay() === 0;

          return (
            <div
              key={log.id}
              className="card p-5 border-ink-600 bg-ink-900/80 space-y-3 relative group"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-ink-800 border border-ink-600 flex items-center justify-center text-lime-400 font-mono text-xs font-semibold">
                    {log.employee_name ? log.employee_name.charAt(0) : "S"}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-bone-50">{log.employee_name || "Staff Member"}</h3>
                    <p className="text-xs text-bone-400 flex items-center gap-1.5">
                      <Folder size={12} className="text-lime-400" />
                      {log.project_title || "General Agency Work"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="mono-tag text-xs bg-ink-800 text-bone-200 px-2.5 py-1 rounded border border-ink-600 flex items-center gap-1">
                    <Calendar size={12} className="text-bone-400" />
                    {new Date(log.work_date).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>

                  {isSun && (
                    <span className="mono-tag text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30 flex items-center gap-1">
                      <Sun size={11} /> Sunday Off
                    </span>
                  )}

                  <span className="mono-tag text-xs text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded border border-lime-400/20 flex items-center gap-1">
                    <Clock size={12} />
                    {log.hours_spent} hrs
                  </span>

                  <button
                    onClick={() => setDeletingId(log.id)}
                    className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-800 cursor-pointer ml-1"
                    title="Delete Log"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Tasks & Details */}
              <div className="space-y-2 text-xs">
                <div className="space-y-1">
                  <span className="mono-tag text-[10px] text-bone-400 block">Tasks & Deliverables Completed</span>
                  <p className="text-bone-200 whitespace-pre-line leading-relaxed bg-ink-950/60 p-3 rounded-lg border border-ink-700/60 font-sans">
                    {log.tasks_completed}
                  </p>
                </div>

                {log.blockers && (
                  <div className="space-y-1 pt-1">
                    <span className="mono-tag text-[10px] text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} /> Blockers / Assistance Needed
                    </span>
                    <p className="text-rose-300 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                      {log.blockers}
                    </p>
                  </div>
                )}

                {log.proof_url && (
                  <div className="pt-1">
                    <a
                      href={log.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-lime-400 hover:underline font-mono text-xs"
                    >
                      <ExternalLink size={12} /> View Proof / Staging Link
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!logs.length && (
          <div className="card p-12 text-center">
            <p className="text-sm text-bone-400">No daily work logs recorded yet.</p>
          </div>
        )}
      </div>

      {/* Add Work Log Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="card w-full max-w-2xl p-6 sm:p-7 bg-ink-900 border-ink-600 relative space-y-4 shadow-2xl my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto custom-admin-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-700/80 pb-3">
              <h2 className="text-lg font-semibold text-bone-50">Submit Staff Daily Work Log</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-bone-400 hover:text-bone-50 hover:bg-ink-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {isSundayDate && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                <Sun size={15} className="shrink-0" />
                <span>Notice: Selected date is Sunday (Official Rest Day). Logging work is optional.</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Both fields must resolve to a real UUID — the previous
                    free-text fallback sent typed names into uuid columns and
                    crashed the server action. */}
                <div>
                  <label className="mono-tag text-xs mb-1 block">Employee / Staff Member *</label>
                  {employeeOptions.length > 0 ? (
                    <CustomSelect
                      options={employeeOptions}
                      value={selectedEmployeeId}
                      onChange={(val) => setSelectedEmployeeId(val)}
                    />
                  ) : (
                    <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                      No active employees yet. Add one in Employees first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mono-tag text-xs mb-1 block">Assigned Project *</label>
                  {projectOptions.length > 0 ? (
                    <CustomSelect
                      options={projectOptions}
                      value={selectedProjectId}
                      onChange={(val) => setSelectedProjectId(val)}
                    />
                  ) : (
                    <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                      No projects yet. Lock a deal to create one.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono-tag text-xs mb-1 block">Work Date *</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mono-tag text-xs mb-1 block">Hours Spent *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="16"
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Tasks & Deliverables Completed *</label>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 p-3 text-sm text-bone-50 focus:border-lime-400 focus:outline-none leading-relaxed"
                  placeholder="- Built user dashboard UI&#10;- Fixed API server action auth bug&#10;- Tested end-to-end payment flow"
                  value={tasksCompleted}
                  onChange={(e) => setTasksCompleted(e.target.value)}
                />
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Blockers / Need Assistance (Optional)</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="e.g. Waiting for client credentials or design approval"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                />
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Proof / Staging URL (Optional)</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none font-mono text-xs"
                  placeholder="https://github.com/... or https://staging..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                />
              </div>

              {/* This is how work reaches the client — a shared log becomes a
                  dated entry on their project timeline in the portal. */}
              <div className="rounded-lg border border-ink-600 bg-ink-950/40 p-3.5 space-y-3">
                <label className="flex cursor-pointer items-start gap-2.5 text-xs">
                  <input
                    type="checkbox"
                    checked={shareWithClient}
                    onChange={(e) => setShareWithClient(e.target.checked)}
                    disabled={!selectedProjectId}
                    className="mt-0.5 accent-[color:var(--color-lime-400)]"
                  />
                  <span>
                    <span className="font-medium text-bone-100">Share this update with the client</span>
                    <span className="mt-0.5 block text-[11px] text-bone-400">
                      {selectedProjectId
                        ? "Adds it to their project timeline in the portal. Blockers stay internal."
                        : "Pick a project first — updates are shown per project."}
                    </span>
                  </span>
                </label>

                {shareWithClient && (
                  <div className="flex items-center gap-3 border-t border-ink-700 pt-3">
                    <label className="mono-tag text-[10px] whitespace-nowrap">Move progress by</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      className="w-20 rounded-lg border border-ink-500 bg-ink-800 px-2 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                      value={progressDelta}
                      onChange={(e) => setProgressDelta(e.target.value)}
                    />
                    <span className="text-[11px] text-bone-400">
                      % — ignored when the project has milestones, which set progress themselves.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-ink-700/80 pt-4">
              <button
                type="button"
                className="btn h-9 px-4 text-xs cursor-pointer"
                onClick={() => setShowAddModal(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary h-9 px-4 text-xs cursor-pointer"
                onClick={handleSaveLog}
                disabled={pending}
              >
                {pending ? "Submitting..." : "Submit Work Log"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Staff Daily Work Log?"
        description="Are you sure you want to delete this daily work log report?"
        confirmText="Delete Log"
        pending={pending}
        onConfirm={handleDeleteLog}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
