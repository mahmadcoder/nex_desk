"use client";

import { useState, useEffect } from "react";
import { CalendarClock, X, Sparkles, Info } from "lucide-react";
import { AGENCY_TZ } from "@/lib/datetime";

export type HolidayItem = {
  id?: string;
  holiday_on: string;
  name: string;
};

type NoticeState = {
  show: boolean;
  timing: "today" | "tomorrow";
  title: string;
  description: string;
  dateStr: string;
  badge: string;
  isHoliday: boolean;
} | null;

/**
 * Format a Date object into `YYYY-MM-DD` in the viewer's target timezone.
 */
function getLocalDateStr(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    // Fallback to UTC ISO date
    return date.toISOString().split("T")[0];
  }
}

/**
 * Format a Date object into human friendly string (e.g. "Sunday, 16 Aug 2026")
 */
function formatHumanDate(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

export default function HolidayNoticeBanner({
  holidays = [],
}: {
  holidays?: HolidayItem[];
}) {
  const [notice, setNotice] = useState<NoticeState>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Determine viewer local timezone
    let tz = AGENCY_TZ;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || AGENCY_TZ;
    } catch {
      tz = AGENCY_TZ;
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 864e5);

    const todayStr = getLocalDateStr(now, tz);
    const tomorrowStr = getLocalDateStr(tomorrow, tz);

    // Day of week in viewer timezone (0 = Sunday, 6 = Saturday)
    const getDayOfWeek = (d: Date) => {
      try {
        const dayName = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d);
        if (dayName === "Sun") return 0;
        if (dayName === "Sat") return 6;
        return d.getDay();
      } catch {
        return d.getDay();
      }
    };

    const todayDay = getDayOfWeek(now);
    const tomorrowDay = getDayOfWeek(tomorrow);

    const todayHoliday = holidays.find((h) => h.holiday_on === todayStr);
    const tomorrowHoliday = holidays.find((h) => h.holiday_on === tomorrowStr);

    // Check dismiss state in sessionStorage
    const dismissKey = `dismiss_holiday_notice_${todayStr}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(dismissKey) === "true") {
      setDismissed(true);
      return;
    }

    // Priority 1: Tomorrow is a Public Holiday
    if (tomorrowHoliday) {
      setNotice({
        show: true,
        timing: "tomorrow",
        title: `Tomorrow is ${tomorrowHoliday.name} — Agency Closed`,
        description: `Please note that offices, production, and regular client communications will be closed tomorrow for ${tomorrowHoliday.name} (${formatHumanDate(tomorrow, tz)}). Normal operations resume on the next working day.`,
        dateStr: formatHumanDate(tomorrow, tz),
        badge: "Tomorrow Holiday",
        isHoliday: true,
      });
      return;
    }

    // Priority 2: Tomorrow is Sunday (Weekly Non-Working Day)
    if (tomorrowDay === 0) {
      setNotice({
        show: true,
        timing: "tomorrow",
        title: "Tomorrow is Sunday — Non-Working Day Notice",
        description: `Tomorrow (${formatHumanDate(tomorrow, tz)}) is Sunday, our weekly non-working day. Offices and customer support will be closed. Normal operations resume on Monday.`,
        dateStr: formatHumanDate(tomorrow, tz),
        badge: "Tomorrow (Sunday)",
        isHoliday: false,
      });
      return;
    }

    // Priority 3: Today is a Public Holiday
    if (todayHoliday) {
      setNotice({
        show: true,
        timing: "today",
        title: `Today is ${todayHoliday.name} — Agency Closed`,
        description: `Today (${formatHumanDate(now, tz)}) is an official holiday for ${todayHoliday.name}. Agency operations and support are closed today.`,
        dateStr: formatHumanDate(now, tz),
        badge: "Today Holiday",
        isHoliday: true,
      });
      return;
    }

    // Priority 4: Today is Sunday
    if (todayDay === 0) {
      setNotice({
        show: true,
        timing: "today",
        title: "Today is Sunday — Non-Working Day",
        description: `Today (${formatHumanDate(now, tz)}) is Sunday, a non-working day. Regular agency operations and meetings will resume tomorrow (Monday).`,
        dateStr: formatHumanDate(now, tz),
        badge: "Today (Sunday)",
        isHoliday: false,
      });
      return;
    }

    setNotice(null);
  }, [holidays]);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      const todayISO = new Date().toISOString().split("T")[0];
      sessionStorage.setItem(`dismiss_holiday_notice_${todayISO}`, "true");
    }
  };

  if (!notice || !notice.show || dismissed) return null;

  const isTomorrow = notice.timing === "tomorrow";

  return (
    <div
      role="alert"
      className={`relative mb-6 overflow-hidden rounded-xl border p-4 shadow-lg transition-all ${
        notice.isHoliday
          ? "border-amber-400/40 bg-gradient-to-r from-amber-950/40 via-ink-900 to-ink-900/90 text-amber-200"
          : "border-lime-400/30 bg-gradient-to-r from-lime-950/30 via-ink-900 to-ink-900/90 text-bone-100"
      }`}
    >
      {/* Decorative top accent glow line */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${
          notice.isHoliday ? "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" : "bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-300"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              notice.isHoliday
                ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                : "border-lime-400/30 bg-lime-400/10 text-lime-400"
            }`}
          >
            {notice.isHoliday ? <Sparkles size={18} /> : <CalendarClock size={18} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`mono-tag inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider rounded-md px-2 py-0.5 ${
                  isTomorrow
                    ? notice.isHoliday
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                      : "bg-lime-400/20 text-lime-300 border border-lime-400/40"
                    : "bg-ink-700 text-bone-300"
                }`}
              >
                <Info size={11} /> {notice.badge}
              </span>
              <span className="mono-tag text-[10px] text-bone-400">
                {notice.dateStr}
              </span>
            </div>

            <h3 className="mt-1.5 text-base font-semibold leading-tight text-bone-50">
              {notice.title}
            </h3>

            <p className="mt-1 text-xs leading-relaxed text-bone-300">
              {notice.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notice"
          className="shrink-0 rounded-lg p-1.5 text-bone-400 transition-colors hover:bg-ink-800 hover:text-bone-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
