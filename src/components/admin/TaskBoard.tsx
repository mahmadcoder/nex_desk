"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { setTaskStatus, toggleTask } from "@/lib/actions/tasks";
import { fmtDate, agencyDay } from "@/lib/datetime";
import TaskDialog from "@/components/admin/TaskDialog";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  Kanban,
  FolderKanban,
  Users2,
  Search,
  Plus,
  Pencil,
  Paperclip,
  Flag,
  CalendarDays,
  UserPlus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const COLUMNS = [
  { key: "todo", label: "Todo", statuses: ["backlog", "todo"] },
  { key: "doing", label: "In Progress", statuses: ["doing"] },
  { key: "review", label: "In Review", statuses: ["review"] },
  { key: "done", label: "Done", statuses: ["done"] },
] as const;

const ORDER = ["todo", "doing", "review", "done"] as const;

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  urgent: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
  high: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  normal: { bg: "bg-ink-700/60", text: "text-bone-300", border: "border-ink-600" },
  low: { bg: "bg-ink-800", text: "text-bone-500", border: "border-ink-700" },
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export default function TaskBoard({
  tasks,
  canManage = false,
  projects = [],
  employees = [],
  initialWho,
  initialProject,
}: {
  tasks: any[];
  canManage?: boolean;
  projects?: { id: string; name: string; client_id?: string; clients?: { company?: string; name?: string } }[];
  employees?: { id: string; full_name: string; avatar_url?: string; job_title?: string }[];
  initialWho?: string;
  initialProject?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultProjectForAdd, setDefaultProjectForAdd] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<"kanban" | "project" | "assignee">("kanban");

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(initialProject || "all");
  const [selectedAssignee, setSelectedAssignee] = useState(initialWho || "all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const todayStr = agencyDay();

  // Filtered tasks computation
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesProject = t.projectName?.toLowerCase().includes(q);
        const matchesClient = t.clientName?.toLowerCase().includes(q);
        const matchesAssignee = t.assignee?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesProject && !matchesClient && !matchesAssignee) {
          return false;
        }
      }

      // Project filter
      if (selectedProject !== "all" && t.project_id !== selectedProject) {
        return false;
      }

      // Assignee filter
      if (selectedAssignee === "unassigned" && t.assigned_employee_id) {
        return false;
      }
      if (selectedAssignee !== "all" && selectedAssignee !== "unassigned" && t.assigned_employee_id !== selectedAssignee) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== "all" && t.priority !== selectedPriority) {
        return false;
      }

      // Overdue filter
      if (onlyOverdue) {
        const isOverdue = t.due_date && t.status !== "done" && t.due_date < todayStr;
        if (!isOverdue) return false;
      }

      return true;
    });
  }, [tasks, search, selectedProject, selectedAssignee, selectedPriority, onlyOverdue, todayStr]);

  // Executive Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo" || t.status === "backlog").length;
    const doing = tasks.filter((t) => t.status === "doing").length;
    const review = tasks.filter((t) => t.status === "review").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const overdue = tasks.filter((t) => t.due_date && t.status !== "done" && t.due_date < todayStr).length;
    const unassigned = tasks.filter((t) => !t.assigned_employee_id && t.status !== "done").length;

    return { total, todo, doing, review, done, overdue, unassigned };
  }, [tasks, todayStr]);

  const openNewTask = (projId?: string) => {
    setDefaultProjectForAdd(projId || null);
    setEditing(null);
    setDialogOpen(true);
  };

  const openTask = (t: any) => {
    setDefaultProjectForAdd(null);
    setEditing(t);
    setDialogOpen(true);
  };

  const move = (task: any, dir: -1 | 1) => {
    const currentKey = COLUMNS.find((c) => (c.statuses as readonly string[]).includes(task.status))?.key ?? "todo";
    const idx = ORDER.indexOf(currentKey as any);
    const next = ORDER[idx + dir];
    if (!next) return;

    setBusy(task.id);
    start(async () => {
      const res = await setTaskStatus(task.id, next as any);
      if (!res.ok) toast.error(res.error ?? "Could not move that task.");
      setBusy(null);
      router.refresh();
    });
  };

  const updateStatusDirect = (task: any, newStatus: "todo" | "doing" | "review" | "done") => {
    setBusy(task.id);
    start(async () => {
      const res = await setTaskStatus(task.id, newStatus);
      if (!res.ok) toast.error(res.error ?? "Could not update status.");
      else toast.success(`Task moved to ${newStatus.toUpperCase()}`);
      setBusy(null);
      router.refresh();
    });
  };

  const handleToggle = (task: any, nextDone: boolean) => {
    setBusy(task.id);
    start(async () => {
      const res = await toggleTask(task.id, nextDone);
      if (!res.ok) toast.error(res.error ?? "Could not update task.");
      setBusy(null);
      router.refresh();
    });
  };

  // Grouped by Project list
  const projectGroups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; clientName: string | null; tasks: any[] }>();

    for (const t of filteredTasks) {
      const pid = t.project_id || "unlinked";
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: t.projectName || "Unlinked Tasks",
          clientName: t.clientName || null,
          tasks: [],
        });
      }
      map.get(pid)!.tasks.push(t);
    }

    // Include projects that have 0 matching tasks if selectedProject === "all" and search is empty
    if (!search && selectedAssignee === "all" && selectedPriority === "all" && !onlyOverdue) {
      for (const p of projects) {
        if (!map.has(p.id)) {
          const clientName = (p as any)?.clients?.company || (p as any)?.clients?.name || null;
          map.set(p.id, {
            id: p.id,
            name: p.name,
            clientName: clientName,
            tasks: [],
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.tasks.length - a.tasks.length);
  }, [filteredTasks, projects, search, selectedAssignee, selectedPriority, onlyOverdue]);

  // Grouped by Staff list
  const staffGroups = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; avatar: string | null; title: string | null; tasks: any[] }
    >();

    // Unassigned container
    const unassignedTasks = filteredTasks.filter((t) => !t.assigned_employee_id);

    for (const emp of employees) {
      const empTasks = filteredTasks.filter((t) => t.assigned_employee_id === emp.id);
      map.set(emp.id, {
        id: emp.id,
        name: emp.full_name,
        avatar: emp.avatar_url || null,
        title: emp.job_title || null,
        tasks: empTasks,
      });
    }

    return {
      unassigned: unassignedTasks,
      staff: Array.from(map.values()).sort((a, b) => b.tasks.length - a.tasks.length),
    };
  }, [filteredTasks, employees]);

  return (
    <div className="space-y-6">
      {/* ── Executive Metric Pulse Bar ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => {
            setSelectedAssignee("all");
            setSelectedProject("all");
            setSelectedPriority("all");
            setOnlyOverdue(false);
          }}
          className="card flex flex-col items-start p-3.5 text-left transition-all hover:border-lime-400/50"
        >
          <span className="mono-tag flex items-center gap-1.5 text-[11px] text-bone-400">
            <FolderKanban size={12} className="text-bone-300" /> Total Active
          </span>
          <span className="mt-1.5 font-mono text-2xl font-bold text-bone-50">{metrics.total}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode("kanban");
            setSelectedPriority("all");
            setOnlyOverdue(false);
          }}
          className="card flex flex-col items-start p-3.5 text-left transition-all hover:border-sky-400/50"
        >
          <span className="mono-tag flex items-center gap-1.5 text-[11px] text-sky-400">
            <Clock size={12} /> In Progress
          </span>
          <span className="mt-1.5 font-mono text-2xl font-bold text-sky-300">{metrics.doing}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode("kanban");
            setSelectedPriority("all");
            setOnlyOverdue(false);
          }}
          className="card flex flex-col items-start p-3.5 text-left transition-all hover:border-violet-400/50"
        >
          <span className="mono-tag flex items-center gap-1.5 text-[11px] text-violet-400">
            <Briefcase size={12} /> In Review
          </span>
          <span className="mt-1.5 font-mono text-2xl font-bold text-violet-300">{metrics.review}</span>
        </button>

        <button
          type="button"
          onClick={() => setOnlyOverdue((v) => !v)}
          className={`card flex flex-col items-start p-3.5 text-left transition-all ${
            onlyOverdue ? "border-rose-400 bg-rose-400/10" : "hover:border-rose-400/50"
          }`}
        >
          <span className="mono-tag flex items-center gap-1.5 text-[11px] text-rose-400">
            <AlertTriangle size={12} /> Overdue
          </span>
          <span className="mt-1.5 font-mono text-2xl font-bold text-rose-300">{metrics.overdue}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedAssignee(selectedAssignee === "unassigned" ? "all" : "unassigned");
          }}
          className={`card flex flex-col items-start p-3.5 text-left transition-all ${
            selectedAssignee === "unassigned" ? "border-amber-400 bg-amber-400/10" : "hover:border-amber-400/50"
          }`}
        >
          <span className="mono-tag flex items-center gap-1.5 text-[11px] text-amber-400">
            <UserPlus size={12} /> Unassigned
          </span>
          <span className="mt-1.5 font-mono text-2xl font-bold text-amber-300">{metrics.unassigned}</span>
        </button>

        <div className="card flex flex-col items-start p-3.5">
          <span className="mono-tag flex items-center gap-1.5 text-[11px] text-lime-400">
            <CheckCircle2 size={12} /> Completed
          </span>
          <span className="mt-1.5 font-mono text-2xl font-bold text-lime-300">{metrics.done}</span>
        </div>
      </div>

      {/* ── Toolbar: View Switchers & Controls ───────────────────── */}
      <div className="card space-y-3.5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View Modes Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-ink-600 bg-ink-900/90 p-1">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-lime-400 text-lime-950 shadow-sm"
                  : "text-bone-400 hover:text-bone-100"
              }`}
            >
              <Kanban size={13} />
              <span>Status Board</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("project")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "project"
                  ? "bg-lime-400 text-lime-950 shadow-sm"
                  : "text-bone-400 hover:text-bone-100"
              }`}
            >
              <FolderKanban size={13} />
              <span>By Project & Client</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("assignee")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "assignee"
                  ? "bg-lime-400 text-lime-950 shadow-sm"
                  : "text-bone-400 hover:text-bone-100"
              }`}
            >
              <Users2 size={13} />
              <span>By Staff Assignee</span>
            </button>
          </div>

          {/* Add Task Button */}
          {canManage && (
            <button
              type="button"
              onClick={() => openNewTask()}
              className="btn btn-primary h-9 gap-1.5 px-4 text-xs"
            >
              <Plus size={14} /> New Task
            </button>
          )}
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search Box */}
          <div className="relative lg:col-span-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, deliverables, projects, clients..."
              className="w-full rounded-lg border border-ink-600 bg-ink-900/80 py-2 pl-9 pr-8 text-xs text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bone-500 hover:text-bone-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Project Filter */}
          <div className="lg:col-span-3">
            <CustomSelect
              value={selectedProject}
              placeholder="All Projects"
              className="py-1.5 text-xs"
              onChange={(v) => setSelectedProject(v || "all")}
              options={[
                { value: "all", label: "All Projects" },
                ...projects.map((p) => {
                  const client = (p as any)?.clients?.company || (p as any)?.clients?.name;
                  return {
                    value: p.id,
                    label: client ? `${p.name} (${client})` : p.name,
                  };
                }),
              ]}
            />
          </div>

          {/* Assignee Filter */}
          <div className="lg:col-span-3">
            <CustomSelect
              value={selectedAssignee}
              placeholder="All Assignees"
              className="py-1.5 text-xs"
              onChange={(v) => setSelectedAssignee(v || "all")}
              options={[
                { value: "all", label: "All Team Members" },
                { value: "unassigned", label: "⚠️ Unassigned Only" },
                ...employees.map((e) => ({
                  value: e.id,
                  label: e.full_name,
                })),
              ]}
            />
          </div>

          {/* Priority Filter */}
          <div className="lg:col-span-2">
            <CustomSelect
              value={selectedPriority}
              placeholder="All Priorities"
              className="py-1.5 text-xs"
              onChange={(v) => setSelectedPriority(v || "all")}
              options={[
                { value: "all", label: "All Priorities" },
                { value: "urgent", label: "🔴 Urgent" },
                { value: "high", label: "🟠 High" },
                { value: "normal", label: "⚪ Normal" },
                { value: "low", label: "⚫ Low" },
              ]}
            />
          </div>
        </div>

        {/* Active Filters Pill Row */}
        {(search || selectedProject !== "all" || selectedAssignee !== "all" || selectedPriority !== "all" || onlyOverdue) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="mono-tag text-[10px] text-bone-400">Active filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-2 py-0.5 text-[10px] text-bone-200">
                Keyword: &quot;{search}&quot;
                <button type="button" onClick={() => setSearch("")} className="hover:text-rose-400">
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedProject !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-2 py-0.5 text-[10px] text-bone-200">
                Project: {projects.find((p) => p.id === selectedProject)?.name}
                <button type="button" onClick={() => setSelectedProject("all")} className="hover:text-rose-400">
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedAssignee !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-2 py-0.5 text-[10px] text-bone-200">
                Assignee: {selectedAssignee === "unassigned" ? "Unassigned" : employees.find((e) => e.id === selectedAssignee)?.full_name}
                <button type="button" onClick={() => setSelectedAssignee("all")} className="hover:text-rose-400">
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedPriority !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-2 py-0.5 text-[10px] text-bone-200">
                Priority: {selectedPriority}
                <button type="button" onClick={() => setSelectedPriority("all")} className="hover:text-rose-400">
                  <X size={10} />
                </button>
              </span>
            )}
            {onlyOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                Overdue Only
                <button type="button" onClick={() => setOnlyOverdue(false)} className="hover:text-rose-400">
                  <X size={10} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedProject("all");
                setSelectedAssignee("all");
                setSelectedPriority("all");
                setOnlyOverdue(false);
              }}
              className="mono-tag text-[10px] text-lime-400 hover:underline"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Edit / Create Task Dialog */}
      {canManage && (
        <TaskDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setDefaultProjectForAdd(null);
          }}
          task={editing}
          projects={projects}
          employees={employees}
          defaultProjectId={defaultProjectForAdd}
        />
      )}

      {/* ── View 1: Status Kanban Board ─────────────────────────── */}
      {viewMode === "kanban" && (
        <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {COLUMNS.map((col, colIdx) => {
            const items = filteredTasks.filter((t) => (col.statuses as readonly string[]).includes(t.status));

            return (
              <section key={col.key} className="w-[85vw] shrink-0 snap-start sm:w-[70vw] lg:w-auto">
                <div className="mb-3 flex items-center justify-between rounded-lg border border-ink-600 bg-ink-850 px-3 py-2">
                  <h2 className="mono-tag flex items-center gap-2 font-semibold text-bone-100">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        col.key === "todo"
                          ? "bg-bone-400"
                          : col.key === "doing"
                            ? "bg-sky-400"
                            : col.key === "review"
                              ? "bg-violet-400"
                              : "bg-lime-400"
                      }`}
                    />
                    {col.label}
                  </h2>
                  <span className="mono-tag rounded-full bg-ink-700 px-2 py-0.5 text-[10px] text-bone-300">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((t) => (
                    <TaskCardItem
                      key={t.id}
                      task={t}
                      canManage={canManage}
                      working={busy === t.id && pending}
                      onEdit={() => openTask(t)}
                      onMove={(dir) => move(t, dir)}
                      colIdx={colIdx}
                      colCount={COLUMNS.length}
                      todayStr={todayStr}
                    />
                  ))}

                  {!items.length && (
                    <div className="rounded-xl border border-dashed border-ink-700 bg-ink-900/40 p-8 text-center">
                      <p className="text-xs text-bone-500">No tasks in {col.label.toLowerCase()}</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ── View 2: Grouped by Project & Client ─────────────────── */}
      {viewMode === "project" && (
        <div className="space-y-6">
          {projectGroups.map((group) => {
            const completedCount = group.tasks.filter((t) => t.status === "done").length;
            const totalCount = group.tasks.length;
            const progressPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <div key={group.id} className="card overflow-hidden">
                {/* Project Header */}
                <div className="flex flex-col gap-3 border-b border-ink-700 bg-ink-850/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/${process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control"}/projects/${group.id}`}
                        className="text-base font-semibold text-bone-50 hover:text-lime-400"
                      >
                        {group.name}
                      </Link>
                      {group.clientName && (
                        <span className="mono-tag rounded-full border border-ink-500 bg-ink-700 px-2 py-0.5 text-[10px] text-bone-300">
                          Client: {group.clientName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-bone-400">
                      {completedCount} of {totalCount} tasks completed ({progressPercent}%)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Mini Progress Bar */}
                    <div className="hidden w-28 sm:block">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
                        <div
                          className="h-full rounded-full bg-lime-400 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {canManage && group.id !== "unlinked" && (
                      <button
                        type="button"
                        onClick={() => openNewTask(group.id)}
                        className="btn btn-outline h-8 gap-1 px-3 text-xs"
                      >
                        <Plus size={12} /> Add Task
                      </button>
                    )}
                  </div>
                </div>

                {/* Project Task List */}
                <div className="divide-y divide-ink-700/60 p-2 sm:p-4">
                  {group.tasks.map((t) => (
                    <TaskRowItem
                      key={t.id}
                      task={t}
                      canManage={canManage}
                      working={busy === t.id && pending}
                      onEdit={() => openTask(t)}
                      onToggle={(next) => handleToggle(t, next)}
                      onStatusChange={(status) => updateStatusDirect(t, status)}
                      todayStr={todayStr}
                    />
                  ))}

                  {!group.tasks.length && (
                    <div className="py-6 text-center text-xs text-bone-500">
                      No active tasks in this project matching filter.
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!projectGroups.length && (
            <div className="card p-12 text-center text-sm text-bone-400">
              No projects found matching your search.
            </div>
          )}
        </div>
      )}

      {/* ── View 3: Grouped by Staff Assignee ───────────────────── */}
      {viewMode === "assignee" && (
        <div className="space-y-6">
          {/* Unassigned Work Triage Section */}
          {staffGroups.unassigned.length > 0 && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/[0.04] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus size={16} className="text-amber-400" />
                  <h3 className="font-semibold text-amber-300">
                    Unassigned Tasks ({staffGroups.unassigned.length})
                  </h3>
                  <span className="mono-tag rounded bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300">
                    Needs Assignment
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {staffGroups.unassigned.map((t) => (
                  <TaskCardItem
                    key={t.id}
                    task={t}
                    canManage={canManage}
                    working={busy === t.id && pending}
                    onEdit={() => openTask(t)}
                    onMove={(dir) => move(t, dir)}
                    colIdx={0}
                    colCount={COLUMNS.length}
                    todayStr={todayStr}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Individual Staff Workload Sections */}
          <div className="grid gap-6 lg:grid-cols-2">
            {staffGroups.staff.map((member) => {
              const activeCount = member.tasks.filter((t) => t.status !== "done").length;
              const completedCount = member.tasks.filter((t) => t.status === "done").length;

              return (
                <div key={member.id} className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-ink-700 bg-ink-850/60 p-4">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <Image
                          src={member.avatar}
                          alt={member.name}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover border border-ink-600"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-400/15 font-mono text-xs font-bold text-lime-300">
                          {initials(member.name)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-bone-50">{member.name}</h3>
                        <p className="text-[11px] text-bone-400">{member.title || "Team Member"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="mono-tag rounded-full bg-ink-700 px-2 py-0.5 text-[10px] text-bone-200">
                        {activeCount} Active
                      </span>
                      {completedCount > 0 && (
                        <span className="mono-tag rounded-full bg-lime-400/10 px-2 py-0.5 text-[10px] text-lime-400">
                          {completedCount} Done
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-ink-700/60 p-2 sm:p-3">
                    {member.tasks.map((t) => (
                      <TaskRowItem
                        key={t.id}
                        task={t}
                        canManage={canManage}
                        working={busy === t.id && pending}
                        onEdit={() => openTask(t)}
                        onToggle={(next) => handleToggle(t, next)}
                        onStatusChange={(status) => updateStatusDirect(t, status)}
                        todayStr={todayStr}
                      />
                    ))}

                    {!member.tasks.length && (
                      <div className="py-6 text-center text-xs text-bone-500">
                        No assigned tasks right now.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponent: Kanban Card ─────────────────────────────────
function TaskCardItem({
  task: t,
  canManage,
  working,
  onEdit,
  onMove,
  colIdx,
  colCount,
  todayStr,
}: {
  task: any;
  canManage: boolean;
  working: boolean;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  colIdx: number;
  colCount: number;
  todayStr: string;
}) {
  const overdue = t.due_date && t.status !== "done" && t.due_date < todayStr;
  const pStyle = PRIORITY_STYLES[t.priority ?? "normal"] ?? PRIORITY_STYLES.normal;

  return (
    <article className={`card p-3.5 transition-all hover:border-ink-500 ${overdue ? "border-amber-400/40 bg-amber-400/[0.02]" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        {canManage ? (
          <button
            type="button"
            onClick={onEdit}
            className={`min-w-0 text-left text-sm font-medium hover:text-lime-400 ${
              t.status === "done" ? "text-bone-400 line-through" : "text-bone-100"
            }`}
          >
            {t.title}
          </button>
        ) : (
          <p
            className={`min-w-0 text-sm font-medium ${
              t.status === "done" ? "text-bone-400 line-through" : "text-bone-100"
            }`}
          >
            {t.title}
          </p>
        )}
        {working && <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin text-lime-400" />}
      </div>

      {t.description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-bone-400">{t.description}</p>
      )}

      {/* Badges: Priority, Due Date, Attachments */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${pStyle.border} ${pStyle.bg} ${pStyle.text}`}>
          <Flag size={9} /> {t.priority ?? "normal"}
        </span>

        {t.due_date && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${overdue ? "border border-amber-400/40 bg-amber-400/10 font-medium text-amber-300" : "bg-ink-700/60 text-bone-400"}`}>
            <CalendarDays size={10} /> {fmtDate(t.due_date)}
          </span>
        )}

        {t.attachmentCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-bone-400">
            <Paperclip size={10} /> {t.attachmentCount}
          </span>
        )}
      </div>

      {/* Project & Client Pill */}
      {t.projectName && (
        <div className="mt-2 flex items-center gap-1.5">
          <Link
            href={`/${process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control"}/projects/${t.project_id}`}
            className="mono-tag truncate text-[10px] text-bone-300 hover:text-lime-400"
          >
            {t.projectName}
            {t.clientName ? ` (${t.clientName})` : ""}
          </Link>
        </div>
      )}

      {/* Assignee Footer */}
      <div className="mt-2.5 flex items-center justify-between border-t border-ink-700/70 pt-2">
        <div className="flex items-center gap-1.5">
          {t.assignee ? (
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime-400/15 font-mono text-[9px] font-semibold text-lime-300">
                {initials(t.assignee)}
              </span>
              <span className="max-w-[120px] truncate text-[11px] text-bone-200">{t.assignee}</span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              <UserPlus size={10} /> Unassigned
            </span>
          )}
        </div>

        {/* Direction Arrows & Edit Button */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={colIdx === 0}
            onClick={() => onMove(-1)}
            aria-label="Move back"
            className="rounded p-1 text-bone-400 hover:bg-ink-700 hover:text-bone-100 disabled:invisible"
          >
            <ChevronLeft size={13} />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={onEdit}
              title="Edit task"
              className="rounded p-1 text-bone-400 hover:bg-ink-700 hover:text-lime-400"
            >
              <Pencil size={12} />
            </button>
          )}

          <button
            type="button"
            disabled={colIdx === colCount - 1}
            onClick={() => onMove(1)}
            aria-label="Move forward"
            className="rounded p-1 text-bone-400 hover:bg-ink-700 hover:text-lime-400 disabled:invisible"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Subcomponent: List Row Item (for Project & Assignee Views) ─
function TaskRowItem({
  task: t,
  canManage,
  working,
  onEdit,
  onToggle,
  onStatusChange,
  todayStr,
}: {
  task: any;
  canManage: boolean;
  working: boolean;
  onEdit: () => void;
  onToggle: (next: boolean) => void;
  onStatusChange: (status: "todo" | "doing" | "review" | "done") => void;
  todayStr: string;
}) {
  const isDone = t.status === "done";
  const overdue = t.due_date && !isDone && t.due_date < todayStr;
  const pStyle = PRIORITY_STYLES[t.priority ?? "normal"] ?? PRIORITY_STYLES.normal;

  return (
    <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={isDone}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-lime-400 cursor-pointer"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={canManage ? onEdit : undefined}
              className={`text-left text-sm font-medium ${
                isDone ? "text-bone-400 line-through" : "text-bone-100 hover:text-lime-400"
              }`}
            >
              {t.title}
            </button>

            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.2 text-[9px] font-medium capitalize ${pStyle.border} ${pStyle.bg} ${pStyle.text}`}>
              {t.priority ?? "normal"}
            </span>

            {overdue && (
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.2 text-[9px] font-medium text-rose-300">
                Overdue
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-bone-400">
            {t.assignee ? (
              <span className="text-bone-200">👤 {t.assignee}</span>
            ) : (
              <span className="text-amber-300 font-medium">⚠️ Unassigned</span>
            )}

            {t.due_date && (
              <span>📅 {fmtDate(t.due_date)}</span>
            )}

            {t.projectName && (
              <span className="text-bone-400 truncate max-w-[180px]">📁 {t.projectName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 self-end sm:self-center">
        {working && <Loader2 size={13} className="animate-spin text-lime-400" />}

        {/* Quick Status Select */}
        <select
          value={t.status}
          onChange={(e) => onStatusChange(e.target.value as any)}
          className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1 text-[11px] text-bone-200 focus:border-lime-400 focus:outline-none"
        >
          <option value="todo">Todo</option>
          <option value="doing">In Progress</option>
          <option value="review">In Review</option>
          <option value="done">Done</option>
        </select>

        {canManage && (
          <button
            type="button"
            onClick={onEdit}
            title="Edit task"
            className="rounded p-1 text-bone-400 hover:bg-ink-700 hover:text-lime-400"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
