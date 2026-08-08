"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitDailyWorkLog, deleteDailyWorkLog } from "@/lib/actions/cms";
import { myOpenTasks, closeTasksFromLog } from "@/lib/actions/tasks";
import { fieldSetFor } from "@/config/logFields";
import AIAssist from "@/components/ui/AIAssist";
import { PageHead } from "@/components/admin/ui";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect, { SelectOption } from "@/components/ui/CustomSelect";
import { IDailyWorkLog } from "@/types/cms";
import { fmtDate, agencyDay } from "@/lib/datetime";
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
  Search as SearchIcon,
} from "lucide-react";

interface DailyLogsClientProps {
  initialLogs: IDailyWorkLog[];
  employeesList: { id: string; name: string }[];
  projectsList: { id: string; title: string; category?: string | null }[];
  /** Staff file only as themselves — show their name instead of a picker. */
  lockedToEmployee?: boolean;
  /**
   * Seconds the timer recorded today. The log stays the narrative; the timer
   * supplies the figure, so the two can never quietly disagree.
   */
  trackedTodaySec?: number;
}

export default function DailyLogsClient({
  initialLogs,
  employeesList,
  projectsList,
  lockedToEmployee = false,
  trackedTodaySec = 0,
}: DailyLogsClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [logs, setLogs] = useState<IDailyWorkLog[]>(initialLogs);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  // Agency time. As a UTC slice this prefilled yesterday's date on anyone
  // logging work after midnight — a wrong default nobody proofreads.
  const todayStr = agencyDay();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeesList[0]?.id || "");
  const [selectedProjectId, setSelectedProjectId] = useState(projectsList[0]?.id || "");
  const [workDate, setWorkDate] = useState(todayStr);
  // Pre-filled from the timer when there is tracked time; "7.5" was a guess
  // nobody ever corrected.
  const trackedHours = Math.round((trackedTodaySec / 3600) * 100) / 100;
  const [hoursSpent, setHoursSpent] = useState(trackedHours > 0 ? String(trackedHours) : "7.5");
  const [tasksCompleted, setTasksCompleted] = useState("");
  const [blockers, setBlockers] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [shareWithClient, setShareWithClient] = useState(true);
  const [progressDelta, setProgressDelta] = useState("0");
  // Answers to the per-service fields, keyed by field id.
  const [metrics, setMetrics] = useState<Record<string, string | boolean>>({});

  // Tasks this log finishes. The board updating itself as a side effect of the
  // log people already write is the whole reason it can be trusted — asking
  // anyone to keep two systems in sync by hand never survives a busy week.
  const [openTasks, setOpenTasks] = useState<
    { id: string; title: string; project_id: string; due_date: string | null }[]
  >([]);
  const [closingTasks, setClosingTasks] = useState<string[]>([]);

  useEffect(() => {
    if (!showAddModal) return;
    let cancelled = false;
    myOpenTasks()
      .then((rows) => { if (!cancelled) setOpenTasks(rows); })
      // Silent: this is a convenience on top of a form that must always work.
      .catch(() => { if (!cancelled) setOpenTasks([]); });
    return () => { cancelled = true; };
  }, [showAddModal]);

  // Only tasks on the project being logged against, so the list stays short
  // and relevant. "General agency work" shows everything open.
  const suggestedTasks = useMemo(
    () =>
      selectedProjectId
        ? openTasks.filter((t) => t.project_id === selectedProjectId)
        : openTasks,
    [openTasks, selectedProjectId]
  );

  // Feed filters. Separate from the submit-form state above — these only ever
  // narrow what is displayed.
  const [filterText, setFilterText] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");

  const visibleLogs = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return logs.filter((l) => {
      if (filterEmployee && l.employee_id !== filterEmployee) return false;
      if (!q) return true;
      return [l.tasks_completed, l.blockers, l.project_title, l.employee_name, l.work_date]
        .some((f) => f && String(f).toLowerCase().includes(q));
    });
  }, [logs, filterText, filterEmployee]);

  /**
   * An SEO day and an engineering day are not the same shape. The project's
   * service category decides which extra inputs appear below the shared
   * "what you did / hours" block — same page, same button, different fields.
   */
  const activeProject = projectsList.find((p) => p.id === selectedProjectId);
  const fieldSet = useMemo(
    () => fieldSetFor(activeProject?.category, activeProject?.title),
    [activeProject?.category, activeProject?.title]
  );

  // Switching to a project of a different kind must not carry the old answers
  // across — they would be saved against fields that are no longer on screen.
  const setMetric = (id: string, v: string | boolean) =>
    setMetrics((m) => ({ ...m, [id]: v }));

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

  const chooseProject = (id: string) => {
    setSelectedProjectId(id);
    setMetrics({});
  };

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
          // Which number this is, so somebody adjusting every single day is
          // visible without anyone being accused of anything.
          hours_source:
            trackedHours <= 0
              ? "manual"
              : parseFloat(hoursSpent) === trackedHours
                ? "tracked"
                : "adjusted",
          hours_tracked: trackedHours > 0 ? trackedHours : null,
          tasks_completed: tasksCompleted,
          blockers: blockers || null,
          proof_url: proofUrl || null,
          client_visible: shareWithClient && !!projObj,
          progress_delta: Number(progressDelta) || 0,
          metrics,
        });

        // Tick off whatever this log finished. Deliberately AFTER the log is
        // saved and in its own try — a task-board hiccup must never look like
        // a lost work log.
        let closed = 0;
        if (closingTasks.length) {
          try {
            const res = await closeTasksFromLog(closingTasks);
            if (res.ok) closed = res.closed;
            else toast.warning(res.error);
          } catch {
            toast.warning("The log saved, but the tasks could not be ticked off.");
          }
        }

        toast.success(
          [
            shareWithClient && projObj
              ? "Work log submitted and shared with the client."
              : "Work log submitted.",
            closed ? `${closed} task${closed === 1 ? "" : "s"} ticked off.` : "",
          ]
            .filter(Boolean)
            .join(" ")
        );
        setShowAddModal(false);
        setTasksCompleted("");
        setBlockers("");
        setProofUrl("");
        setProgressDelta("0");
        setMetrics({});
        setClosingTasks([]);
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
            className="btn btn-primary h-9 px-4 text-sm flex items-center gap-2 cursor-pointer"
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

      {/* Filtering happens here rather than on the server: the feed is already
          loaded in full for the counts, so narrowing it is instant and needs no
          round trip. */}
      {logs.length > 3 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon
              size={14}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone-500"
            />
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search tasks, blockers, project or person…"
              aria-label="Search work logs"
              className="w-full rounded-lg border border-ink-500 bg-ink-800 py-2 pl-9 pr-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none"
            />
          </div>

          {!lockedToEmployee && employeesList.length > 1 && (
            <div className="w-full sm:w-[200px]">
              <CustomSelect
                value={filterEmployee}
                onChange={setFilterEmployee}
                placeholder="Everyone"
                options={[
                  { value: "", label: "Everyone" },
                  ...employeesList.map((e) => ({ value: e.id, label: e.name })),
                ]}
              />
            </div>
          )}

          {(filterText || filterEmployee) && (
            <button
              type="button"
              onClick={() => { setFilterText(""); setFilterEmployee(""); }}
              className="btn btn-sm"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Logs Feed */}
      <div className="space-y-4">
        {!visibleLogs.length && !!logs.length && (
          <div className="card p-10 text-center">
            <p className="text-sm text-bone-300">No log matches that.</p>
          </div>
        )}
        {visibleLogs.map((log) => {
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
                    {fmtDate(log.work_date)}
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
                  {lockedToEmployee && employeeOptions.length === 1 ? (
                    <p className="rounded-lg border border-ink-500 bg-ink-800/60 px-3 py-2 text-sm text-bone-100">
                      {employeeOptions[0].label}
                    </p>
                  ) : employeeOptions.length > 0 ? (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  {/* Say where the number came from. A pre-filled figure with
                      no explanation reads as an arbitrary default, which is
                      exactly what the old hardcoded 7.5 was. */}
                  {trackedHours > 0 && (
                    <p className="mt-1 text-[11px] text-bone-400">
                      {parseFloat(hoursSpent) === trackedHours ? (
                        <>Your timer recorded {trackedHours}h today.</>
                      ) : (
                        <span className="text-amber-400">
                          Your timer recorded {trackedHours}h — this is an adjustment.
                        </span>
                      )}
                    </p>
                  )}
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
                {/* Staff write these fast; clients read them on the timeline.
                    The prompt keeps every fact and only translates the jargon. */}
                <AIAssist
                  field="work_log"
                  getText={() => tasksCompleted}
                  context={{ project: activeProject?.title ?? "", service_category: activeProject?.category ?? "" }}
                  onApply={setTasksCompleted}
                />
              </div>

              {/* The link between the two systems. Ticking here is the only
                  place anyone needs to close a task, so the board stays true
                  without being a second job. */}
              {!!suggestedTasks.length && (
                <div className="rounded-lg border border-ink-600 bg-ink-800/50 p-3">
                  <p className="mono-tag mb-2 text-xs text-bone-300">
                    Did this finish any of your tasks?
                  </p>
                  <ul className="space-y-1.5">
                    {suggestedTasks.map((t) => (
                      <li key={t.id}>
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-lime-400"
                            checked={closingTasks.includes(t.id)}
                            onChange={(e) =>
                              setClosingTasks((prev) =>
                                e.target.checked
                                  ? [...prev, t.id]
                                  : prev.filter((x) => x !== t.id)
                              )
                            }
                          />
                          <span className="text-xs leading-relaxed text-bone-200">
                            {t.title}
                            {t.due_date && (
                              <span className="ml-1.5 text-[11px] text-bone-400">
                                due {t.due_date}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-bone-400">
                    Leave them unticked if they are still in progress.
                  </p>
                </div>
              )}

              <div>
                <label className="mono-tag text-xs mb-1 block">Blockers / Need Assistance (Optional)</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="e.g. Waiting for client credentials or design approval"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                />
              </div>

              {/* Fields specific to the kind of work this project is. Driven by
                  the service category, so an SEO log captures rankings and an
                  engineering log captures shipped features — same form. */}
              {fieldSet && (
                <div className="space-y-3 rounded-lg border border-lime-400/20 bg-lime-400/[0.04] p-3.5">
                  <p className="mono-tag text-[11px] text-lime-300">{fieldSet.label} detail</p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {fieldSet.fields.map((f) => (
                      <div key={f.id} className={f.type === "textarea" ? "sm:col-span-2" : undefined}>
                        {f.type === "boolean" ? (
                          <label className="flex cursor-pointer items-start gap-2.5 pt-5 text-xs">
                            <input
                              type="checkbox"
                              checked={!!metrics[f.id]}
                              onChange={(e) => setMetric(f.id, e.target.checked)}
                              className="mt-0.5 accent-[color:var(--color-lime-400)]"
                            />
                            <span className="text-bone-100">{f.label}</span>
                          </label>
                        ) : (
                          <>
                            <label className="mono-tag mb-1 block text-[11px]">{f.label}</label>
                            <input
                              className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                              type={f.type === "number" ? "number" : "text"}
                              placeholder={f.placeholder}
                              value={String(metrics[f.id] ?? "")}
                              onChange={(e) => setMetric(f.id, e.target.value)}
                            />
                          </>
                        )}
                        {f.hint && (
                          <p className="mt-1 text-[11px] leading-relaxed text-bone-300">{f.hint}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] leading-relaxed text-bone-300">
                    Optional, but this is what makes a monthly report possible. Leave anything
                    blank that does not apply today.
                  </p>
                </div>
              )}

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
                className="btn h-9 px-4 text-sm cursor-pointer"
                onClick={() => setShowAddModal(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary h-9 px-4 text-sm cursor-pointer"
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
