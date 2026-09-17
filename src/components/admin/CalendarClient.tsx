"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { fmtTime, fmtDayLabel } from "@/lib/datetime";
import { monthGrid, isoOf, KIND_STYLE, type CalendarItem, type CalendarKind } from "@/lib/calendar";
import { useScrollLock } from "@/lib/useScrollLock";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ListFilter,
  CheckCircle2,
  Video,
  Clock,
  Sparkles,
  Flag,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Layers,
  ListTodo,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type FilterCategory = "all" | "task" | "meeting" | "deadline" | "leave" | "holiday";

interface CalendarClientProps {
  events: [string, CalendarItem[]][];
  currentYear: number;
  currentMonth: number; // 0-indexed
  monthLabel: string;
  todayIso: string;
  isPrivileged: boolean;
  basePath: string;
}

export default function CalendarClient({
  events,
  currentYear,
  currentMonth,
  monthLabel,
  todayIso,
  isPrivileged,
  basePath,
}: CalendarClientProps) {
  const router = useRouter();

  // Active view: grid (month) vs agenda (timeline)
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid");

  // Filter category
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  // Selected day for Inspector drawer
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Lock scroll when day drawer is open
  useScrollLock(!!selectedDay);

  // Close drawer on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDay(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Construct map of date -> items
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const [date, items] of events) {
      map.set(date, items);
    }
    return map;
  }, [events]);

  // All items flattened for counting
  const allItems = useMemo(() => {
    return events.flatMap(([, items]) => items);
  }, [events]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const c = {
      all: allItems.length,
      task: 0,
      meeting: 0,
      deadline: 0,
      leave: 0,
      holiday: 0,
    };
    for (const item of allItems) {
      if (item.kind === "task") c.task++;
      else if (item.kind === "meeting") c.meeting++;
      else if (item.kind === "deadline" || item.kind === "milestone" || item.kind === "estimate") c.deadline++;
      else if (item.kind === "leave") c.leave++;
      else if (item.kind === "holiday") c.holiday++;
    }
    return c;
  }, [allItems]);

  // Filter helper
  const itemMatchesFilter = (item: CalendarItem, filter: FilterCategory) => {
    if (filter === "all") return true;
    if (filter === "task") return item.kind === "task";
    if (filter === "meeting") return item.kind === "meeting";
    if (filter === "deadline") return item.kind === "deadline" || item.kind === "milestone" || item.kind === "estimate";
    if (filter === "leave") return item.kind === "leave";
    if (filter === "holiday") return item.kind === "holiday";
    return true;
  };

  // 42-cell Month Grid
  const grid = useMemo(() => {
    return monthGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Agenda items: sorted dates
  const agendaDates = useMemo(() => {
    const from = isoOf(new Date(currentYear, currentMonth, 1));
    const to = isoOf(new Date(currentYear, currentMonth + 1, 0));

    return [...eventsByDay.entries()]
      .filter(([d]) => d >= from && d <= to)
      .map(([d, items]) => {
        const filteredItems = items.filter((i) => itemMatchesFilter(i, activeFilter));
        return { date: d, items: filteredItems };
      })
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [eventsByDay, currentYear, currentMonth, activeFilter]);

  // Selected day items
  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    const items = eventsByDay.get(selectedDay) ?? [];
    return items.filter((i) => itemMatchesFilter(i, activeFilter));
  }, [selectedDay, eventsByDay, activeFilter]);

  // Month navigation URLs
  const monthParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const prevMonthUrl = `${basePath}/calendar?month=${monthParam(new Date(currentYear, currentMonth - 1, 1))}`;
  const nextMonthUrl = `${basePath}/calendar?month=${monthParam(new Date(currentYear, currentMonth + 1, 1))}`;
  const todayMonthUrl = `${basePath}/calendar?month=${todayIso.slice(0, 7)}`;
  const isCurrentMonth = todayIso.slice(0, 7) === `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const FILTER_TABS: { id: FilterCategory; label: string; icon: any; count: number; color: string }[] = [
    { id: "all", label: "All Events", icon: Layers, count: counts.all, color: "text-bone-100" },
    { id: "task", label: "Tasks Due", icon: ListTodo, count: counts.task, color: "text-purple-400" },
    { id: "meeting", label: "Meetings", icon: Video, count: counts.meeting, color: "text-lime-400" },
    { id: "deadline", label: "Deadlines & Milestones", icon: Flag, count: counts.deadline, color: "text-rose-400" },
    { id: "leave", label: "Leave", icon: UserCheck, count: counts.leave, color: "text-bone-400" },
    { id: "holiday", label: "Official Holidays", icon: Sparkles, count: counts.holiday, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-5">
      {/* ── Top Bar: Month Picker, Today Jump & View Mode Switcher ──────── */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-ink-600 bg-ink-900 p-0.5">
            <Link
              href={prevMonthUrl}
              className="flex h-8 w-8 items-center justify-center rounded-md text-bone-400 transition-colors hover:bg-ink-800 hover:text-bone-100"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="min-w-[140px] px-3 text-center text-sm font-medium text-bone-100">
              {monthLabel}
            </span>
            <Link
              href={nextMonthUrl}
              className="flex h-8 w-8 items-center justify-center rounded-md text-bone-400 transition-colors hover:bg-ink-800 hover:text-bone-100"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Jump to Today */}
          {!isCurrentMonth ? (
            <Link
              href={todayMonthUrl}
              className="mono-tag inline-flex items-center gap-1.5 rounded-lg border border-lime-400/40 bg-lime-400/10 px-3 py-1.5 text-xs text-lime-300 transition-colors hover:bg-lime-400/20"
            >
              Jump to Today
            </Link>
          ) : (
            <span className="mono-tag inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800/60 px-2.5 py-1.5 text-[11px] text-bone-400">
              Current Month
            </span>
          )}
        </div>

        {/* View Switcher: Month Grid vs Agenda List */}
        <div className="flex items-center gap-1 self-start sm:self-auto">
          <div className="inline-flex items-center rounded-lg border border-ink-600 bg-ink-900 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                viewMode === "grid"
                  ? "bg-ink-700 text-bone-50 shadow-sm font-semibold"
                  : "text-bone-400 hover:text-bone-200"
              )}
            >
              <CalendarIcon size={14} />
              <span>Month Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                viewMode === "agenda"
                  ? "bg-ink-700 text-bone-50 shadow-sm font-semibold"
                  : "text-bone-400 hover:text-bone-200"
              )}
            >
              <ListFilter size={14} />
              <span>Agenda Timeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Category Filter Tabs ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => {
          const active = activeFilter === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "mono-tag relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                active
                  ? "border-lime-400/40 bg-lime-400/10 text-lime-300 font-semibold shadow-sm"
                  : "border-ink-600 bg-ink-800/80 text-bone-300 hover:border-ink-500 hover:text-bone-100"
              )}
            >
              <Icon size={13} className={active ? "text-lime-400" : tab.color} />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.2 text-[10px]",
                  active ? "bg-lime-400 text-ink-950 font-bold" : "bg-ink-700 text-bone-400"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── VIEW 1: 6×7 Month Grid View ─────────────────────────────────── */}
      {viewMode === "grid" && (
        <div className="card overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-ink-600 bg-ink-900/60">
            {WEEKDAYS.map((d, index) => (
              <div
                key={d}
                className={cn(
                  "py-2.5 text-center text-xs font-medium tracking-wide uppercase",
                  index === 6 ? "text-amber-400/80" : "text-bone-400"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 bg-ink-700/20">
            {grid.map((d) => {
              const iso = isoOf(d);
              const items = (eventsByDay.get(iso) ?? []).filter((i) =>
                itemMatchesFilter(i, activeFilter)
              );
              const outside = d.getMonth() !== currentMonth;
              const isToday = iso === todayIso;
              const isSunday = d.getDay() === 0;

              // Check if day has an official holiday
              const hasHoliday = items.some((i) => i.kind === "holiday");

              return (
                <div
                  key={iso}
                  onClick={() => setSelectedDay(iso)}
                  className={cn(
                    "group relative min-h-[118px] border-b border-r border-ink-700/60 p-2 transition-colors cursor-pointer select-none",
                    outside ? "bg-ink-950/50" : "bg-ink-900/20 hover:bg-ink-800/40",
                    isToday && "bg-lime-400/[0.04] ring-1 ring-inset ring-lime-400/40",
                    hasHoliday && !outside && "bg-amber-400/[0.03]"
                  )}
                >
                  {/* Date number & mini badges */}
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                        isToday
                          ? "bg-lime-400 font-bold text-lime-950 shadow-sm"
                          : outside
                            ? "text-bone-600"
                            : isSunday
                              ? "text-bone-400"
                              : "text-bone-300 group-hover:text-bone-100"
                      )}
                    >
                      {d.getDate()}
                    </span>

                    {/* Today indicator text */}
                    {isToday && (
                      <span className="mono-tag text-[9px] font-bold uppercase tracking-wider text-lime-400">
                        Today
                      </span>
                    )}

                    {/* Weekend label */}
                    {!isToday && isSunday && !outside && (
                      <span className="mono-tag text-[9px] text-bone-500">Off</span>
                    )}
                  </div>

                  {/* Day Events Pill List (up to 3 shown) */}
                  <div className="space-y-1">
                    {items.slice(0, 3).map((item, idx) => {
                      const style = KIND_STYLE[item.kind] ?? KIND_STYLE.task;

                      return (
                        <div
                          key={`${iso}-${idx}`}
                          title={`${style.label}: ${item.title}`}
                          className={cn(
                            "flex items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors border",
                            style.bg,
                            style.border,
                            style.text
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />

                          {/* Meeting Time */}
                          {item.kind === "meeting" && item.time && (
                            <span className="font-mono text-[10px] opacity-80 shrink-0">
                              {fmtTime(item.time)}
                            </span>
                          )}

                          {/* Title */}
                          <span className="truncate text-bone-100">{item.title}</span>

                          {/* Video camera badge */}
                          {item.kind === "meeting" && item.join_url && (
                            <Video size={10} className="shrink-0 text-lime-400 ml-auto" />
                          )}

                          {/* Task overdue badge */}
                          {item.kind === "task" && item.is_overdue && (
                            <span className="mono-tag text-[9px] text-rose-400 font-bold shrink-0 ml-auto">
                              !
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* More button */}
                    {items.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(iso);
                        }}
                        className="mono-tag mt-0.5 block w-full rounded bg-ink-800/80 px-1 py-0.5 text-center text-[10px] text-bone-300 hover:bg-ink-700 hover:text-bone-100"
                      >
                        +{items.length - 3} more items
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: Chronological Agenda Timeline View ──────────────────── */}
      {viewMode === "agenda" && (
        <div className="space-y-4">
          {!agendaDates.length ? (
            <div className="card p-12 text-center">
              <CalendarDays className="mx-auto mb-3 h-8 w-8 text-bone-500" />
              <p className="text-base font-medium text-bone-200">No events found for this filter</p>
              <p className="mt-1 text-xs text-bone-400">
                Try switching the category filter or navigate to another month.
              </p>
            </div>
          ) : (
            agendaDates.map(({ date, items }) => {
              const isToday = date === todayIso;
              const dateObj = new Date(`${date}T00:00:00`);
              const dayLabel = dateObj.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              });

              return (
                <div
                  key={date}
                  className={cn(
                    "card p-5 transition-colors",
                    isToday ? "border-lime-400/40 bg-lime-950/[0.04]" : ""
                  )}
                >
                  {/* Date Header */}
                  <div className="mb-3 flex items-center justify-between border-b border-ink-700/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "mono-tag text-xs font-semibold",
                          isToday ? "text-lime-300" : "text-bone-200"
                        )}
                      >
                        {dayLabel}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-bold text-ink-950 uppercase">
                          Today
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedDay(date)}
                      className="mono-tag text-[11px] text-bone-400 hover:text-lime-400 cursor-pointer"
                    >
                      Inspect Day →
                    </button>
                  </div>

                  {/* Items for this date */}
                  <div className="space-y-2.5">
                    {items.map((item, idx) => (
                      <AgendaItemRow key={`${date}-${idx}`} item={item} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Slide-Over / Modal: Day Inspector Drawer ────────────────────── */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedDay(null)}
          />

          {/* Modal Card */}
          <div
            data-lenis-prevent
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-ink-600 bg-ink-900 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-700 bg-ink-850 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-bone-50">
                    {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  {selectedDay === todayIso && (
                    <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-bold text-ink-950 uppercase">
                      Today
                    </span>
                  )}
                </div>
                <p className="mono-tag mt-0.5 text-[11px] text-bone-400">
                  {selectedDayItems.length} item{selectedDayItems.length === 1 ? "" : "s"} scheduled
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-lg p-2 text-bone-400 transition-colors hover:bg-ink-700 hover:text-bone-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!selectedDayItems.length ? (
                <div className="py-12 text-center text-bone-400">
                  <CalendarDays className="mx-auto mb-2 h-8 w-8 text-bone-500" />
                  <p className="text-sm font-medium">No items scheduled for this day</p>
                  <p className="mt-1 text-xs">Enjoy the open time or choose another date.</p>
                </div>
              ) : (
                selectedDayItems.map((item, idx) => (
                  <DayInspectorCard key={`${selectedDay}-${idx}`} item={item} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-ink-700 bg-ink-850 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="btn btn-outline h-9 px-4 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Card inside Day Inspector Drawer */
function DayInspectorCard({ item }: { item: CalendarItem }) {
  const style = KIND_STYLE[item.kind] ?? KIND_STYLE.task;

  // 1. Holiday Card
  if (item.kind === "holiday") {
    return (
      <div className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-950/40 via-ink-900 to-ink-900 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-400">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="mono-tag text-[10px] font-semibold text-amber-300 uppercase">
              Official Agency Holiday
            </span>
            <h4 className="mt-1 text-base font-semibold text-bone-50">{item.title}</h4>
            <p className="mt-1 text-xs text-bone-300">
              Agency offices and support are closed today. Normal operations resume on the next working day.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Meeting Card
  if (item.kind === "meeting") {
    return (
      <div className="rounded-xl border border-lime-400/30 bg-ink-800/60 p-4 transition-all hover:border-lime-400/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-tag inline-flex items-center gap-1 rounded-md border border-lime-400/40 bg-lime-400/10 px-2 py-0.5 text-[10px] font-semibold text-lime-300 uppercase">
                <Video size={10} /> Meeting
              </span>
              {item.time && (
                <span className="mono-tag text-xs font-mono text-bone-300">
                  {fmtTime(item.time)} ({item.duration_min ?? 30} min)
                </span>
              )}
            </div>

            <h4 className="mt-2 text-base font-semibold text-bone-50">{item.title}</h4>

            {item.client_name && (
              <p className="mono-tag mt-1 text-[11px] text-bone-300">
                Client: <span className="text-bone-100">{item.client_name}</span>
              </p>
            )}

            {item.agenda && (
              <p className="mt-2 rounded-lg bg-ink-900/60 p-2.5 text-xs leading-relaxed text-bone-300">
                <strong className="text-bone-200">Agenda:</strong> {item.agenda}
              </p>
            )}
          </div>

          {/* Join Call Button */}
          {item.join_url && (
            <div className="shrink-0 self-start">
              <a
                href={item.join_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary h-9 gap-1.5 px-4 text-xs cursor-pointer shadow-md"
              >
                <Video size={13} /> Join Call
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Task Card
  if (item.kind === "task") {
    return (
      <div
        className={cn(
          "rounded-xl border p-4 transition-all",
          item.is_overdue
            ? "border-rose-400/40 bg-rose-950/10"
            : "border-purple-500/30 bg-ink-800/60 hover:border-purple-500/50"
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-tag inline-flex items-center gap-1 rounded-md border border-purple-400/40 bg-purple-400/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 uppercase">
                <ListTodo size={10} /> Task Due
              </span>

              {/* Priority badge */}
              {item.priority && (
                <span
                  className={cn(
                    "mono-tag rounded-md px-1.5 py-0.5 text-[10px] uppercase font-bold",
                    item.priority === "urgent"
                      ? "border border-rose-500/50 bg-rose-500/15 text-rose-300"
                      : item.priority === "high"
                        ? "border border-amber-500/50 bg-amber-500/15 text-amber-300"
                        : "border border-ink-600 bg-ink-700 text-bone-300"
                  )}
                >
                  {item.priority}
                </span>
              )}

              {/* Status badge */}
              {item.status && (
                <span className="mono-tag rounded-md border border-ink-600 bg-ink-700 px-1.5 py-0.5 text-[10px] text-bone-300">
                  {item.status.replace(/_/g, " ")}
                </span>
              )}

              {/* Overdue alert */}
              {item.is_overdue && (
                <span className="mono-tag inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
                  <AlertTriangle size={11} /> Overdue
                </span>
              )}
            </div>

            <h4 className="mt-2 text-base font-semibold text-bone-50">{item.title}</h4>

            {item.project_name && (
              <p className="mono-tag mt-1 text-[11px] text-bone-300">
                Project: <span className="text-bone-100">{item.project_name}</span>
                {item.client_name ? ` · Client: ${item.client_name}` : ""}
              </p>
            )}
          </div>

          {/* Action to view task */}
          {item.href && (
            <Link
              href={item.href}
              className="btn btn-outline h-8 gap-1 px-3 text-xs self-start shrink-0"
            >
              <span>View Task</span>
              <ArrowUpRight size={12} />
            </Link>
          )}
        </div>
      </div>
    );
  }

  // 4. Default / Deadline / Milestone / Leave Card
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all bg-ink-800/60",
        style.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "mono-tag inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase border",
              style.bg,
              style.border,
              style.text
            )}
          >
            {style.label}
          </span>

          <h4 className="mt-1.5 text-base font-semibold text-bone-50">{item.title}</h4>

          {item.detail && (
            <p className="mono-tag mt-1 text-[11px] text-bone-300">{item.detail}</p>
          )}
        </div>

        {item.href && (
          <Link
            href={item.href}
            className="btn btn-outline h-8 gap-1 px-3 text-xs self-start shrink-0"
          >
            <span>Details</span>
            <ArrowUpRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}

/** Row inside Agenda View */
function AgendaItemRow({ item }: { item: CalendarItem }) {
  const style = KIND_STYLE[item.kind] ?? KIND_STYLE.task;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-ink-700/60 bg-ink-800/40 p-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-ink-800/80 transition-colors">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", style.dot)} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "mono-tag rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase border",
                style.bg,
                style.border,
                style.text
              )}
            >
              {style.label}
            </span>

            {item.time && (
              <span className="mono-tag text-xs font-mono text-bone-300">
                {fmtTime(item.time)}
              </span>
            )}

            {item.priority && (
              <span
                className={cn(
                  "mono-tag rounded px-1.5 py-0.2 text-[9px] uppercase font-bold",
                  item.priority === "urgent"
                    ? "text-rose-300 bg-rose-500/15"
                    : item.priority === "high"
                      ? "text-amber-300 bg-amber-500/15"
                      : "text-bone-400 bg-ink-700"
                )}
              >
                {item.priority}
              </span>
            )}

            {item.is_overdue && (
              <span className="mono-tag text-[9px] font-bold text-rose-400">Overdue</span>
            )}
          </div>

          <p className="mt-1 text-sm font-medium text-bone-100">{item.title}</p>

          {item.detail && (
            <p className="mono-tag mt-0.5 text-[10px] text-bone-400">{item.detail}</p>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        {item.join_url && (
          <a
            href={item.join_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary h-8 gap-1 px-3 text-xs"
          >
            <Video size={12} /> Join Call
          </a>
        )}

        {item.href && !item.join_url && (
          <Link href={item.href} className="btn btn-outline h-8 gap-1 px-3 text-xs">
            <span>View</span>
            <ArrowUpRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}
