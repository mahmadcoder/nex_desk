"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDayLabel, fmtTime } from "@/lib/datetime";
import { describeKind, TONE_CLASS } from "@/config/notificationKinds";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import type { NotificationCategory, NotificationCounts } from "@/lib/notifications";
import {
  Bell,
  Check,
  CheckCheck,
  Undo2,
  Search,
  X,
  User,
  Users,
  Sparkles,
  ExternalLink,
  ArrowUpRight,
  Layers,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SOURCE_TABS: {
  id: "all" | NotificationCategory;
  label: string;
  icon: any;
  toneColor: string;
  activeClass: string;
}[] = [
  {
    id: "all",
    label: "All Activity",
    icon: Layers,
    toneColor: "text-bone-200",
    activeClass: "border-lime-400/50 bg-lime-400/10 text-lime-300",
  },
  {
    id: "client",
    label: "Client Activity",
    icon: User,
    toneColor: "text-emerald-400",
    activeClass: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
  },
  {
    id: "staff",
    label: "Staff Activity",
    icon: Users,
    toneColor: "text-sky-400",
    activeClass: "border-sky-500/50 bg-sky-500/15 text-sky-300",
  },
  {
    id: "system",
    label: "System & Alerts",
    icon: Sparkles,
    toneColor: "text-amber-400",
    activeClass: "border-amber-500/50 bg-amber-500/15 text-amber-300",
  },
];

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

function formatRelativeTime(dateStr: string): string {
  const diffSec = Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return fmtDayLabel(dateStr);
}

interface NotificationsClientProps {
  initialNotifications: any[];
  counts: NotificationCounts;
  isPrivileged: boolean;
  basePath: string;
}

export default function NotificationsClient({
  initialNotifications,
  counts,
  isPrivileged,
  basePath,
}: NotificationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Read URL params or default
  const urlTab = searchParams.get("tab") === "read" ? "read" : "unread";
  const urlSource = (searchParams.get("source") as "all" | NotificationCategory) || "all";
  const initialSearch = searchParams.get("q") || "";

  const [activeTab, setActiveTab] = useState<"unread" | "read">(urlTab);
  const [activeSource, setActiveSource] = useState<"all" | NotificationCategory>(urlSource);
  const [search, setSearch] = useState(initialSearch);

  // Optimistic local state
  const [notifications, setNotifications] = useState<any[]>(initialNotifications);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const updateUrl = (tab: "unread" | "read", source: "all" | NotificationCategory, q: string) => {
    const params = new URLSearchParams();
    if (tab === "read") params.set("tab", "read");
    if (source !== "all") params.set("source", source);
    if (q.trim()) params.set("q", q.trim());
    const str = params.toString();
    router.replace(str ? `${basePath}/notifications?${str}` : `${basePath}/notifications`, {
      scroll: false,
    });
  };

  const handleTabChange = (nextTab: "unread" | "read") => {
    setActiveTab(nextTab);
    updateUrl(nextTab, activeSource, search);
    router.refresh();
  };

  const handleSourceChange = (nextSource: "all" | NotificationCategory) => {
    setActiveSource(nextSource);
    updateUrl(activeTab, nextSource, search);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateUrl(activeTab, activeSource, val);
  };

  // Optimistic single mark read/unread
  const handleToggleRead = (id: string, currentRead: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: currentRead ? null : new Date().toISOString() } : n
        )
      );

      const res = await markNotificationRead(id, !currentRead);
      if (!res.ok) {
        toast.error(res.error);
        // Rollback on error
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, read_at: currentRead ? new Date().toISOString() : null } : n
          )
        );
        return;
      }
      router.refresh();
    });
  };

  // Mark all read (scoped to current category if selected)
  const handleMarkAllRead = () => {
    startTransition(async () => {
      // Optimistic update
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => {
          if (activeSource === "all" || n.category === activeSource) {
            return { ...n, read_at: now };
          }
          return n;
        })
      );

      const res = await markAllNotificationsRead(activeSource === "all" ? undefined : activeSource);
      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
        return;
      }
      toast.success(
        activeSource === "all"
          ? "All notifications marked as read."
          : `All ${activeSource} notifications marked as read.`
      );
      router.refresh();
    });
  };

  // Filtered notifications
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Read / Unread tab
      const isRead = !!n.read_at;
      if (activeTab === "unread" && isRead) return false;
      if (activeTab === "read" && !isRead) return false;

      // 2. Source Category tab
      if (activeSource !== "all" && n.category !== activeSource) {
        return false;
      }

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesBody = n.body?.toLowerCase().includes(q);
        const matchesActor = n.actor_label?.toLowerCase().includes(q);
        const matchesKind = n.kind?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody && !matchesActor && !matchesKind) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, activeTab, activeSource, search]);

  // Group filtered results by day
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const n of filtered) {
      const day = fmtDayLabel(n.created_at);
      map.set(day, [...(map.get(day) ?? []), n]);
    }
    return map;
  }, [filtered]);

  const currentTabCounts = counts[activeTab];
  const currentCategoryUnreadCount =
    activeSource === "all" ? counts.unread.all : counts.unread[activeSource];

  return (
    <div className="space-y-6">
      {/* ── Tier 1: Header & Read/Unread State Tabs ────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Unread vs History Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange("unread")}
            className={cn(
              "mono-tag relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer",
              activeTab === "unread"
                ? "border border-lime-400/40 bg-lime-400/10 text-lime-300 font-semibold"
                : "border border-ink-600 bg-ink-800 text-bone-300 hover:border-ink-500 hover:text-bone-100"
            )}
          >
            <Bell size={13} className={activeTab === "unread" ? "text-lime-400" : "text-bone-400"} />
            Unread
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                activeTab === "unread"
                  ? "bg-lime-400 text-ink-950 font-bold"
                  : "bg-ink-700 text-bone-300"
              )}
            >
              {counts.unread.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("read")}
            className={cn(
              "mono-tag inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer",
              activeTab === "read"
                ? "border border-lime-400/40 bg-lime-400/10 text-lime-300 font-semibold"
                : "border border-ink-600 bg-ink-800 text-bone-300 hover:border-ink-500 hover:text-bone-100"
            )}
          >
            All History
            <span className="ml-1 rounded-full bg-ink-700 px-1.5 py-0.2 text-[10px] text-bone-300">
              {counts.read.all}
            </span>
          </button>
        </div>

        {/* Action: Mark All Read */}
        {activeTab === "unread" && currentCategoryUnreadCount > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={handleMarkAllRead}
            className="btn btn-outline h-9 gap-1.5 px-3.5 text-xs self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck size={14} className="text-lime-400" />
            <span>
              {pending
                ? "Clearing…"
                : activeSource === "all"
                  ? `Mark all ${currentCategoryUnreadCount} read`
                  : `Mark ${currentCategoryUnreadCount} ${activeSource} read`}
            </span>
          </button>
        )}
      </div>

      {/* ── Tier 2: Source Category Tabs & Search Bar ─────────── */}
      <div className="card space-y-3 p-3 sm:p-4">
        {/* Source Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {SOURCE_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = currentTabCounts[tab.id];
            const isActive = activeSource === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSourceChange(tab.id)}
                className={cn(
                  "mono-tag flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all cursor-pointer",
                  isActive
                    ? tab.activeClass
                    : "border-ink-600 bg-ink-800/80 text-bone-300 hover:border-ink-500 hover:bg-ink-800 hover:text-bone-100"
                )}
              >
                <Icon size={14} className={isActive ? "text-current" : tab.toneColor} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                    isActive ? "bg-black/20 text-current" : "bg-ink-700 text-bone-400"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by client, staff member, task title, or keyword…"
            className="w-full rounded-lg border border-ink-600 bg-ink-850 py-2 pl-9 pr-8 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bone-400 hover:text-bone-100 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Notifications Feed ─────────────────────────────────── */}
      {!filtered.length ? (
        <div className="card p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 border border-ink-600">
            <Bell size={20} className="text-bone-400" />
          </div>
          <h3 className="text-sm font-semibold text-bone-100">
            {search
              ? `No notifications found matching "${search}"`
              : activeTab === "read"
                ? `No past notifications in ${activeSource === "all" ? "history" : activeSource + " history"}`
                : `You're all caught up on ${activeSource === "all" ? "everything" : activeSource + " activity"}!`}
          </h3>
          <p className="mx-auto max-w-md text-xs text-bone-400 leading-relaxed">
            {search
              ? "Try searching for a different keyword, name, or clear the search input."
              : activeSource === "client"
                ? "When clients sign agreements, approve deliverables, submit payment proofs, or open support tickets, they will appear here."
                : activeSource === "staff"
                  ? "When staff submit daily work logs, move task statuses, request leave, or check in for attendance, they will appear here."
                  : activeSource === "system"
                    ? "Automated alerts like incoming website leads, expense renewals, and system warnings will appear here."
                    : "No notifications need your attention right now."}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="mono-tag text-xs text-lime-400 hover:underline pt-1 cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([day, items]) => (
            <section key={day} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="mono-tag text-[11px] font-semibold text-bone-400 uppercase tracking-wider">
                  {day}
                </span>
                <span className="h-px flex-1 bg-ink-700/60" />
                <span className="mono-tag text-[10px] text-bone-500">
                  {items.length} {items.length === 1 ? "event" : "events"}
                </span>
              </div>

              <div className="divide-y divide-ink-700/80 overflow-hidden rounded-xl border border-ink-600 bg-ink-850/80 shadow-md">
                {items.map((n) => {
                  const style = describeKind(n.kind);
                  const Icon = style.icon;
                  const isUnread = !n.read_at;
                  const category: NotificationCategory = n.category || "system";

                  return (
                    <article
                      key={n.id}
                      className={cn(
                        "group relative flex items-start gap-3.5 p-4 transition-all hover:bg-ink-800/60",
                        isUnread && "bg-lime-400/[0.03]"
                      )}
                    >
                      {/* Unread Accent Indicator */}
                      {isUnread && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 bg-lime-400"
                          title="Unread notification"
                        />
                      )}

                      {/* Event Kind Icon */}
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700 bg-ink-800">
                        <Icon size={16} className={cn(TONE_CLASS[style.tone])} />
                      </div>

                      {/* Content Area */}
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Header Badge Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Source Category Pill */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                              category === "client"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : category === "staff"
                                  ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            )}
                          >
                            {category === "client" ? (
                              <User size={9} />
                            ) : category === "staff" ? (
                              <Users size={9} />
                            ) : (
                              <Sparkles size={9} />
                            )}
                            {category}
                          </span>

                          {/* Event Kind Label */}
                          <span className="mono-tag text-[10px] text-bone-400">
                            {style.label}
                          </span>

                          {/* Actor Badge */}
                          {n.actor_label && (
                            <span className="inline-flex items-center gap-1 rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-bone-200">
                              <span className="font-mono text-[9px] font-bold text-bone-400">
                                {initials(n.actor_label)}
                              </span>
                              <span>{n.actor_label}</span>
                            </span>
                          )}

                          {/* Relative Timestamp */}
                          <span
                            className="mono-tag text-[10px] text-bone-500 ml-auto"
                            title={fmtTime(n.created_at)}
                          >
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </div>

                        {/* Title (Clickable link if href present) */}
                        {n.href ? (
                          <Link
                            href={n.href}
                            className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-bone-100 hover:text-lime-300 transition-colors"
                          >
                            <span>{n.title}</span>
                            <ArrowUpRight
                              size={13}
                              className="opacity-60 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 group-hover/link:opacity-100 text-lime-400"
                            />
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-bone-100">{n.title}</p>
                        )}

                        {/* Body / Description */}
                        {n.body && (
                          <p className="text-xs leading-relaxed text-bone-300 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                      </div>

                      {/* Right Action Controls */}
                      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                        {/* Direct Deep Link Button */}
                        {n.href && (
                          <Link
                            href={n.href}
                            className="rounded-lg border border-ink-600 bg-ink-800/80 p-1.5 text-bone-400 hover:border-lime-400/40 hover:bg-ink-700 hover:text-lime-300 transition-colors"
                            title="Open related record"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        )}

                        {/* Toggle Read/Unread Button */}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleToggleRead(n.id, !isUnread)}
                          title={isUnread ? "Mark as read" : "Mark as unread"}
                          aria-label={isUnread ? "Mark as read" : "Mark as unread"}
                          className={cn(
                            "rounded-lg border p-1.5 transition-colors cursor-pointer disabled:opacity-40",
                            isUnread
                              ? "border-lime-400/40 bg-lime-400/10 text-lime-300 hover:bg-lime-400/20"
                              : "border-ink-600 bg-ink-800/80 text-bone-400 hover:border-ink-500 hover:text-bone-100"
                          )}
                        >
                          {isUnread ? <Check size={13} /> : <Undo2 size={13} />}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Admin Information Note */}
      {isPrivileged && activeTab === "unread" && (
        <p className="text-[11px] leading-relaxed text-bone-400 pt-2 border-t border-ink-700/60">
          💡 Marking a notification as read updates it for everyone on the management team. Use the
          tabs above to focus specifically on <strong>Client Activity</strong> (agreements, payments,
          approvals) or <strong>Staff Activity</strong> (daily logs, attendance, task moves).
        </p>
      )}
    </div>
  );
}
