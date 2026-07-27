"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Exit-intent nudge — the calm alternative to a timed popup.
 *
 * Fires ONCE per browser session, and only when the cursor leaves the top of
 * the viewport (the "I'm about to close this tab" motion) on desktop, or on a
 * fast upward scroll on mobile. Never nags, never repeats. Instead of begging
 * for a newsletter signup, it offers something useful on the way out — the
 * pre-launch checklist — so leaving still feels like a win for the visitor.
 */

const KEY = "nd-exit-nudge-shown"; // sessionStorage: only once per visit

export default function ExitNudge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(KEY)) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastY = window.scrollY;

    const trigger = () => {
      if (window.sessionStorage.getItem(KEY)) return;
      window.sessionStorage.setItem(KEY, "1");
      setShow(true);
      cleanup();
    };

    // desktop: cursor leaves through the top of the window
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };
    // mobile: a decisive upward flick near the top (heading for the address bar)
    const onScroll = () => {
      if (!reduce && lastY - window.scrollY > 40 && window.scrollY < 200) trigger();
      lastY = window.scrollY;
    };

    const armTimer = setTimeout(() => {
      document.addEventListener("mouseout", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
    }, 8000); // give people at least 8s before arming

    function cleanup() {
      clearTimeout(armTimer);
      document.removeEventListener("mouseout", onLeave);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-950/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => setShow(false)}
    >
      <div
        role="dialog"
        aria-label="Before you go"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-ink-600 bg-ink-900 p-8 shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
          <span className="mono-tag">Before you go</span>
        </div>

        <h3 className="mt-4 text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Take our launch checklist with you.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-bone-400">
          The exact list every project passes before it goes live — performance, testing,
          SEO, security, handover. Use it on us, or on whoever builds your next site.
        </p>

        <div className="mt-6 flex items-center gap-2.5">
          <Link href="/contact" onClick={() => setShow(false)} className="btn btn-primary h-11 px-5 text-sm">
            Show me the checklist
          </Link>
          <button onClick={() => setShow(false)} className="btn h-11 px-5 text-sm">
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
