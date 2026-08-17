"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Play,
  CheckCircle2,
  ListChecks,
  Search,
  Filter,
  User,
  FolderKanban,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { fmtDateTime, fmtTime, humanDuration } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control";

export default function StaffActivityClient({
  activeTimers = [],
  staffSummaries = [],
  recentActivity = [],
  allTasks = [],
}: {
  activeTimers: any[];
  staffSummaries: any[];
  recentActivity: any[];
  allTasks: any[];
}) {
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredTasks = allTasks.filter((t) => {
    if (selectedStaff !== "all" && t.assigned_employee_id !== selectedStaff) return false;
    if (taskFilter !== "all" && t.status !== taskFilter) return false;
    if (
      search &&
      !t.title?.toLowerCase().includes(search.toLowerCase()) &&
      !t.projects?.name?.toLowerCase().includes(search.toLowerCase()) &&
      !t.employees?.full_name?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredActivity = recentActivity.filter((a) => {
    if (selectedStaff !== "all" && a.user_id !== selectedStaff && a.actor_label !== selectedStaff) {
      return false;
    }
    if (
      search &&
      !a.summary?.toLowerCase().includes(search.toLowerCase()) &&
      !a.actor_label?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* 1. Live Working Staff Widget */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-500"></span>
          </span>
          <h2 className="text-base font-semibold text-bone-50">
            Live Working Now ({activeTimers.length})
          </h2>
        </div>

        {!activeTimers.length ? (
          <div className="card p-6 text-center text-sm text-bone-400">
            <Clock className="mx-auto h-7 w-7 text-bone-500 mb-2 opacity-60" />
            No staff members are running an active timer right now.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeTimers.map((t) => {
              const elapsedSec = Math.max(
                0,
                Math.round((Date.now() - new Date(t.started_at).getTime()) / 1000)
              );
              return (
                <div
                  key={t.id}
                  className="card border-lime-400/30 bg-gradient-to-br from-lime-400/[0.06] via-ink-900 to-ink-900/80 p-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-bone-100 text-sm truncate">
                        {t.employees?.full_name || "Staff Member"}
                      </p>
                      <p className="text-xs text-lime-400 font-medium mt-0.5 truncate">
                        {t.tasks?.title ? `Task: ${t.tasks.title}` : t.projects?.name ? `Project: ${t.projects.name}` : "General Work"}
                      </p>
                    </div>
                    <span className="mono-tag text-[10px] px-2 py-0.5 rounded bg-lime-400/15 text-lime-300 font-semibold border border-lime-400/40 shrink-0">
                      Active
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-bone-400 border-t border-ink-700/60 pt-2.5">
                    <span>Started at {fmtTime(t.started_at)}</span>
                    <span className="font-mono text-lime-300 font-medium">
                      ⏱ {humanDuration(elapsedSec)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Staff Task Breakdown Matrix */}
      <section>
        <h2 className="text-base font-semibold text-bone-50 mb-3">Staff Task Pipeline</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {staffSummaries.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedStaff(selectedStaff === s.id ? "all" : s.id)}
              className={`card p-4 cursor-pointer transition-all ${
                selectedStaff === s.id
                  ? "border-lime-400 ring-1 ring-lime-400/30 bg-ink-800/80"
                  : "hover:border-ink-500"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-bone-100 text-sm truncate">{s.name}</p>
                <span className="mono-tag text-[10px] text-bone-400">{s.jobTitle || "Team"}</span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                <div className="bg-ink-800/60 rounded p-1.5 border border-ink-700">
                  <span className="block text-[10px] text-bone-400">Todo</span>
                  <span className="font-mono text-xs font-semibold text-bone-200">{s.todo}</span>
                </div>
                <div className="bg-blue-400/10 rounded p-1.5 border border-blue-400/30">
                  <span className="block text-[10px] text-blue-300">Doing</span>
                  <span className="font-mono text-xs font-semibold text-blue-200">{s.doing}</span>
                </div>
                <div className="bg-amber-400/10 rounded p-1.5 border border-amber-400/30">
                  <span className="block text-[10px] text-amber-300">Review</span>
                  <span className="font-mono text-xs font-semibold text-amber-200">{s.review}</span>
                </div>
                <div className="bg-lime-400/10 rounded p-1.5 border border-lime-400/30">
                  <span className="block text-[10px] text-lime-300">Done</span>
                  <span className="font-mono text-xs font-semibold text-lime-200">{s.done}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Filterable Tasks & Live Activity Matrix */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Left: Task Explorer */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-bone-50">
              Tasks Explorer ({filteredTasks.length})
            </h2>

            <div className="flex flex-wrap gap-1.5">
              {(["all", "todo", "doing", "review", "done"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTaskFilter(st)}
                  className={`mono-tag text-[11px] px-2.5 py-1 rounded transition-colors cursor-pointer capitalize ${
                    taskFilter === st
                      ? "bg-lime-400/15 text-lime-300 font-semibold border border-lime-400/30"
                      : "text-bone-400 hover:text-bone-200 hover:bg-ink-800"
                  }`}
                >
                  {st === "all" ? "All Status" : st}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-bone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by task title, project, or assignee..."
              className="w-full rounded-lg border border-ink-500 bg-ink-800 pl-9 pr-3 py-1.5 text-xs text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none"
            />
          </div>

          {!filteredTasks.length ? (
            <div className="card p-8 text-center text-sm text-bone-400">
              No tasks found matching current filters.
            </div>
          ) : (
            <div className="card divide-y divide-ink-600">
              {filteredTasks.map((t) => (
                <div key={t.id} className="p-3.5 hover:bg-ink-800/30 transition-colors space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-bone-100 text-sm leading-snug">{t.title}</p>
                    <span
                      className={`mono-tag text-[10px] px-2 py-0.5 rounded capitalize shrink-0 ${
                        t.status === "done"
                          ? "bg-lime-400/10 text-lime-300 border border-lime-400/30"
                          : t.status === "review"
                            ? "bg-amber-400/10 text-amber-300 border border-amber-400/30"
                            : t.status === "doing"
                              ? "bg-blue-400/10 text-blue-300 border border-blue-400/30"
                              : "bg-ink-800 text-bone-400 border border-ink-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bone-400">
                    {t.employees?.full_name && (
                      <span className="inline-flex items-center gap-1">
                        <User size={12} className="text-bone-500" /> {t.employees.full_name}
                      </span>
                    )}
                    {t.projects?.name && (
                      <Link
                        href={`/${ADMIN_PATH}/projects/${t.project_id}?tab=tasks`}
                        className="inline-flex items-center gap-1 hover:text-lime-400 transition-colors"
                      >
                        <FolderKanban size={12} className="text-bone-500" /> {t.projects.name}
                      </Link>
                    )}
                    {t.due_date && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-bone-500">
                        <Calendar size={11} /> Due {t.due_date}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: Live Activity Stream */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-bone-50">Recent Task & Work Feed</h2>

          {!filteredActivity.length ? (
            <div className="card p-8 text-center text-sm text-bone-400">
              No recent task activity recorded yet.
            </div>
          ) : (
            <div className="card divide-y divide-ink-600">
              {filteredActivity.map((a, idx) => (
                <div key={idx} className="p-3.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-bone-100">{a.actor_label || "Staff"}</span>
                    <span className="mono-tag text-[10px] text-bone-500">
                      {fmtDateTime(a.created_at)}
                    </span>
                  </div>
                  <p className="text-bone-300 leading-relaxed">{a.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
