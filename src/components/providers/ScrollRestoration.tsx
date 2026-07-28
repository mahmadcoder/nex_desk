"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function ScrollRestoration() {
  const pathname = usePathname();
  const isPopState = useRef(false);

  useEffect(() => {
    // Enable browser scroll restoration handling
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const handlePopState = () => {
      isPopState.current = true;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = `nx_scroll_${pathname}`;

    if (isPopState.current) {
      // User navigated via Back/Forward button
      const savedPosition = sessionStorage.getItem(storageKey);
      if (savedPosition !== null) {
        const targetY = parseInt(savedPosition, 10);
        setTimeout(() => {
          window.scrollTo({ top: targetY, behavior: "instant" });
        }, 50);
      }
      isPopState.current = false;
    } else {
      // User navigated via a new link click - scroll to top
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    // Continuously save scroll position as user scrolls
    const handleScroll = () => {
      sessionStorage.setItem(storageKey, window.scrollY.toString());
    };

    let timeoutId: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", throttledScroll);
    };
  }, [pathname]);

  return null;
}
