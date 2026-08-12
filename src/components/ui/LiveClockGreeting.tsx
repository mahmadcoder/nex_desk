"use client";

import { useState, useEffect } from "react";
import { Clock, Sun, Moon, Sunrise, Sunset, Sparkles } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface LiveClockGreetingProps {
  name?: string | null;
  role?: string | null;
  subText?: string | null;
  className?: string;
}

export default function LiveClockGreeting({
  name,
  role,
  subText,
  className = "",
}: LiveClockGreetingProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [tzAbbrev, setTzAbbrev] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setNow(new Date());

    // Detect timezone abbreviation (e.g. PKT, EST, GMT+5, etc.)
    try {
      const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZoneName: "short",
        timeZone: tzName,
      }).formatToParts(new Date());
      const tzPart = parts.find((p) => p.type === "timeZoneName");
      setTzAbbrev(tzPart?.value || tzName || "");
    } catch {
      setTzAbbrev("");
    }

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!mounted || !now) {
    return (
      <div className={`card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-ink-600 bg-ink-900/60 ${className}`}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-6 w-36 bg-ink-700 rounded" />
        </div>
      </div>
    );
  }

  const hours = now.getHours();

  let greeting = "Hello";
  let GreetingIcon = Sun;
  let iconColor = "text-amber-400";
  let toneBadge = "Good day";

  if (hours >= 5 && hours < 12) {
    greeting = "Good morning";
    GreetingIcon = Sunrise;
    iconColor = "text-amber-300";
    toneBadge = "Morning";
  } else if (hours >= 12 && hours < 17) {
    greeting = "Good afternoon";
    GreetingIcon = Sun;
    iconColor = "text-lime-400";
    toneBadge = "Afternoon";
  } else if (hours >= 17 && hours < 22) {
    greeting = "Good evening";
    GreetingIcon = Sunset;
    iconColor = "text-orange-400";
    toneBadge = "Evening";
  } else {
    greeting = "Working late";
    GreetingIcon = Moon;
    iconColor = "text-indigo-300";
    toneBadge = "Night";
  }

  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const displayName = name ? name.split(" ")[0] : "";

  return (
    <div
      className={`card relative overflow-hidden p-4 sm:p-5 border-ink-600/80 bg-gradient-to-r from-ink-900/90 via-ink-800/60 to-ink-900/90 backdrop-blur-md shadow-lg ${className}`}
    >
      {/* Decorative subtle ambient glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime-400/5 blur-2xl" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Greeting & Name */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800/80 px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase text-bone-300">
              <GreetingIcon size={12} className={iconColor} />
              {toneBadge}
            </span>
            {role && (
              <span className="mono-tag text-[10px] text-bone-400 capitalize">
                • {role} portal
              </span>
            )}
          </div>

          <h2
            className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-bone-50 flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {greeting}
            {displayName ? `, ${displayName}` : ""}
            <span className="inline-block animate-pulse text-lg">✨</span>
          </h2>

          <p className="mt-0.5 text-xs text-bone-300 truncate">
            {subText || `${formattedDate}`}
          </p>
        </div>

        {/* Right: Live Ticking Clock */}
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-ink-600/80 bg-ink-950/70 px-4 py-2.5 shadow-inner">
          <Clock size={18} className="text-lime-400 shrink-0 animate-pulse" />
          <div className="text-right">
            <div
              className="text-base sm:text-lg font-mono font-bold tracking-wider text-bone-50 leading-none"
            >
              {formattedTime}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-bone-400 mono-tag">
              <span>{tzAbbrev}</span>
              <span>•</span>
              <span className="text-bone-300">Local time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
