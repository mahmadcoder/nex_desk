"use client";

import { useEffect } from "react";
import { getLenis } from "@/components/site/SmoothScroll";

/**
 * Stops the page scrolling behind an open overlay.
 *
 * Three things are needed, and missing any one of them leaves the page moving:
 *
 *   1. **Pause Lenis.** On the marketing site Lenis scrolls the window with
 *      `window.scrollTo()`, which is a PROGRAMMATIC scroll — `overflow: hidden`
 *      only stops a USER scrolling, so CSS alone can never hold it. `stop()`
 *      makes its RAF loop return early and its wheel handler `preventDefault`
 *      and bail. This is the one that actually fixes it.
 *
 *   2. **Lock `<html>`, not `<body>`.** The element that scrolls a document is
 *      the documentElement; locking body leaves the real container free. This
 *      still matters in the admin panel, where Lenis never runs.
 *
 *   3. **`data-lenis-prevent` on the overlay**, which the caller adds — on the
 *      backdrop so wheeling outside the card is ignored, and on the scrollable
 *      panel so its own overflow keeps working while Lenis is stopped. That
 *      attribute is checked BEFORE the stopped check inside Lenis, which is
 *      exactly why the panel needs to keep it.
 *
 * Also pads for the scrollbar it removes, or the whole page jumps sideways the
 * moment a dialog opens.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const root = document.documentElement;
    const body = document.body;

    // Null in the admin panel and under prefers-reduced-motion, where no Lenis
    // instance is ever created.
    const lenis = getLenis();
    lenis?.stop();

    // Read before writing — restoring to "" would throw away a value the page
    // legitimately set, e.g. the `overflow-x: hidden` in globals.css.
    const prevRootOverflow = root.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;

    const scrollbar = window.innerWidth - root.clientWidth;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbar > 0) {
      const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbar}px`;
    }

    return () => {
      root.style.overflow = prevRootOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevPadding;
      // Re-read rather than reusing the captured handle: SmoothScroll may have
      // remounted (and replaced the instance) while the overlay was open.
      getLenis()?.start();
    };
  }, [locked]);
}
