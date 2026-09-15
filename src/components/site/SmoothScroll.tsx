"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The instance, exposed so overlays and navigation listeners can control it.
 *
 * Lenis scrolls by calling `window.scrollTo()` — a PROGRAMMATIC scroll. CSS
 * `overflow: hidden` only blocks a USER scrolling, so no amount of it stops
 * Lenis moving the page behind an open dialog. The only thing that works is
 * `lenis.stop()`, and that needs a handle on the instance.
 */
let instance: Lenis | null = null;

export const getLenis = () => instance;

export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    instance = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Prevent default browser auto-restoration fighting Lenis
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Intercept in-page hash links (e.g. #pricing-tiers) for smooth Lenis scrolling
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a[href^="#"]');
      if (!target) return;
      const hash = target.getAttribute("href");
      if (!hash || hash === "#") return;
      const element = document.querySelector(hash);
      if (element) {
        e.preventDefault();
        lenis.scrollTo(element as HTMLElement, { offset: -80, duration: 1 });
      }
    };
    document.addEventListener("click", handleAnchorClick);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
      instance = null;
    };
  }, []);

  // Whenever route pathname changes, reset scroll to top immediately
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if navigating to a specific hash on the new page
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        if (instance) {
          instance.scrollTo(el as HTMLElement, { offset: -80, immediate: true, force: true });
        } else {
          el.scrollIntoView();
        }
        return;
      }
    }

    // Standard route transition: instantly reset Lenis virtual scroll & window to top (0, 0)
    if (instance) {
      instance.scrollTo(0, { immediate: true, force: true });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Double-check on next frame and after brief DOM render to ensure no layout shift restored old scroll
    const rafId = requestAnimationFrame(() => {
      if (instance && !window.location.hash) {
        instance.scrollTo(0, { immediate: true, force: true });
      }
      window.scrollTo(0, 0);
      ScrollTrigger.refresh();
    });

    const timer = setTimeout(() => {
      if (instance && !window.location.hash) {
        instance.scrollTo(0, { immediate: true, force: true });
      }
      ScrollTrigger.refresh();
    }, 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
