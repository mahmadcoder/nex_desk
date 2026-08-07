"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The instance, exposed so overlays can pause it.
 *
 * Lenis scrolls by calling `window.scrollTo()` — a PROGRAMMATIC scroll. CSS
 * `overflow: hidden` only blocks a USER scrolling, so no amount of it stops
 * Lenis moving the page behind an open dialog. The only thing that works is
 * `lenis.stop()`, and that needs a handle on the instance.
 */
let instance: Lenis | null = null;

export const getLenis = () => instance;

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    instance = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      instance = null;
    };
  }, []);
  return null;
}
