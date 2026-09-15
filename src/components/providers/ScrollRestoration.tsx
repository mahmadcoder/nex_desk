"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getLenis } from "@/components/site/SmoothScroll";

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
          const lenis = getLenis();
          if (lenis) {
            lenis.scrollTo(targetY, { immediate: true, force: true });
          } else {
            window.scrollTo({ top: targetY, behavior: "instant" });
          }
        }, 50);
      }
      isPopState.current = false;
    } else {
      // User navigated via a new link click - scroll to top
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(0, { immediate: true, force: true });
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    // Continuously save scroll position as user scrolls
    const handleScroll = () => {
      const lenis = getLenis();
      const currentY = lenis ? Math.round(lenis.scroll) : window.scrollY;
      sessionStorage.setItem(storageKey, currentY.toString());
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
