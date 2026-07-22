"use client";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { LogoMark } from "@/components/brand/Logo";

/** Logo draws itself, counter runs to 100, curtain lifts. Once per session. */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const skip =
      sessionStorage.getItem("nd-loaded") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (skip) {
      sessionStorage.setItem("nd-loaded", "1");
      setDone(true);
      return;
    }

    const ctx = gsap.context(() => {
      const c = { v: 0 };
      gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem("nd-loaded", "1");
          setDone(true);
        },
      })
        .to(c, {
          v: 100, duration: 1.6, ease: "power2.inOut",
          onUpdate: () => {
            if (num.current) num.current.textContent = String(Math.round(c.v)).padStart(3, "0");
          },
        })
        .to(".pl-fade", { opacity: 0, duration: 0.3 })
        .to(root.current, { yPercent: -100, duration: 0.9, ease: "expo.inOut" });
    }, root);

    return () => ctx.revert();
  }, []);

  if (done) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[100] flex flex-col justify-between bg-ink-950 p-[var(--gutter)]">
      <div className="pl-fade flex items-center gap-3">
        <LogoMark className="h-10 w-10 text-bone-50" />
        <span className="mono-tag">nex desk</span>
      </div>
      <div className="pl-fade flex items-end justify-between gap-6">
        <span className="mono-tag max-w-[22ch]">setting up the desk</span>
        <span ref={num} className="text-[clamp(4rem,14vw,10rem)] leading-none tracking-tighter"
          style={{ fontFamily: "var(--font-display)" }}>000</span>
      </div>
    </div>
  );
}
