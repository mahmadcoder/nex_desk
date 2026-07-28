"use client";

import { useEffect, useState } from "react";
import Link from "next/link";


const KEY = "nd-cookie-consent"; // "granted" | "denied"

/** Call this before loading any analytics/tracking script. */
export function hasAnalyticsConsent() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "granted";
}

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // show only if no choice has been made yet
    const saved = window.localStorage.getItem(KEY);
    if (!saved) {
      const t = setTimeout(() => setShow(true), 800); // let the page settle first
      return () => clearTimeout(t);
    }
  }, []);

  const choose = (value: "granted" | "denied") => {
    window.localStorage.setItem(KEY, value);
    setShow(false);
    // when you add analytics, you can react to consent here, e.g.:
    // if (value === "granted") loadAnalytics();
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="cookie-slide-up fixed inset-x-0 bottom-0 z-[70] border-t border-ink-600 bg-ink-900/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[var(--shell-max)] flex-col items-start gap-4 px-[var(--gutter)] py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* left: indicator + text */}
        <div className="flex items-start gap-3 sm:items-center">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-400 sm:mt-0" />
          <p className="text-sm leading-relaxed text-bone-200">
            We use cookies to run this site and improve your experience. You can accept or decline non-essential cookies.{" "}
            <Link
              href="/privacy"
              className="text-bone-400 underline decoration-ink-500 underline-offset-2 transition-colors hover:text-lime-400"
            >
              Privacy&nbsp;Policy
            </Link>
          </p>
        </div>

        {/* right: actions */}
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            onClick={() => choose("granted")}
            className="btn btn-primary h-9 px-5 text-sm"
          >
            Accept
          </button>
          <button
            onClick={() => choose("denied")}
            className="btn h-9 px-5 text-sm"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
