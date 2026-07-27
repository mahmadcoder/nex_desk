"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";

/**
 * The actual desk.
 *
 * The site is called Nex Desk, so here is a real (illustrated, top-down) desk
 * built in SVG. Each object is a doorway — the monitor to the work, the
 * notebook to how we work, the phone to contact, the mug is just a mug (its
 * steam drifts). Hovering an object lifts it and reveals a label; the live
 * Islamabad time shows on the phone. Everything is drawn in code, so nothing
 * loads and nothing breaks. Reduced-motion users get a calm, static desk.
 */

import { DESK_HOTSPOTS, DeskHotspotId } from "@/config/siteContent";

type Hot = DeskHotspotId | null;

const HOTSPOTS = DESK_HOTSPOTS;

function useIslamabadTime() {
  const [t, setT] = useState("--:--");
  useEffect(() => {
    const tick = () =>
      setT(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Karachi",
          hour12: false,
        }).format(new Date())
      );
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function TheDesk() {
  const [hot, setHot] = useState<Hot>(null);
  const root = useRef<HTMLDivElement>(null);
  const time = useIslamabadTime();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // drifting mug steam
      gsap.to(".steam path", {
        y: -14,
        opacity: 0,
        duration: 2.4,
        ease: "power1.out",
        stagger: 0.5,
        repeat: -1,
      });
      // slow blink on the screen cursor
      gsap.to(".screen-caret", { opacity: 0, duration: 0.6, repeat: -1, yoyo: true, ease: "steps(1)" });
    }, root);
    return () => ctx.revert();
  }, []);

  const active = HOTSPOTS.find((h) => h.id === hot);

  return (
    <section className="shell py-28">
      <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        {/* copy */}
        <div>
          <p className="drawer-label">The desk</p>
          <h2 className="mt-6 text-[var(--text-h2)]">Pull up a chair.</h2>
          <p className="mt-5 text-bone-400">
            We&apos;re called Nex Desk for a reason. This is where your project gets built —
            one desk, one team, everything in reach. Have a look around.
          </p>

          {/* dynamic caption reacts to whatever you're hovering */}
          <div className="mt-8 flex h-16 items-center">
            {active ? (
              <Link href={active.href} className="btn btn-primary">
                {active.label} →
              </Link>
            ) : (
              <p className="mono-tag max-w-xs">
                hover the desk — the screen, the notebook, the phone each lead somewhere
              </p>
            )}
          </div>
        </div>

        {/* the desk */}
        <div ref={root} className="relative">
          <svg viewBox="0 0 520 400" className="w-full" role="img" aria-label="An illustrated desk. Explore the objects on it.">
            {/* desk surface */}
            <rect x="20" y="40" width="480" height="330" rx="18" fill="#131318" stroke="#26262F" />
            {/* faint grid on the desk */}
            <defs>
              <pattern id="deskgrid" width="26" height="26" patternUnits="userSpaceOnUse">
                <path d="M26 0H0V26" fill="none" stroke="#F4F1EA" strokeOpacity="0.05" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect x="20" y="40" width="480" height="330" rx="18" fill="url(#deskgrid)" />

            {/* ---- MONITOR ---- */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHot("monitor")}
              onMouseLeave={() => setHot(null)}
              onClick={() => (window.location.href = "/work")}
              style={{ transform: hot === "monitor" ? "translateY(-6px)" : "translateY(0)", transition: "transform .3s" }}
            >
              <rect x="150" y="70" width="220" height="140" rx="10" fill="#0B0B0F" stroke={hot === "monitor" ? "#D0FF4E" : "#33333E"} strokeWidth={hot === "monitor" ? 2 : 1} />
              {/* tiny site on screen */}
              <rect x="164" y="84" width="192" height="14" rx="3" fill="#1B1B22" />
              <circle cx="172" cy="91" r="2" fill="#33333E" />
              <rect x="164" y="106" width="120" height="10" rx="2" fill="#26262F" />
              <rect x="164" y="122" width="90" height="8" rx="2" fill="#1B1B22" />
              <rect x="164" y="150" width="70" height="24" rx="6" fill="#D0FF4E" />
              <rect x="300" y="150" width="56" height="24" rx="6" fill="#1B1B22" />
              <rect className="screen-caret" x="258" y="122" width="3" height="8" fill="#D0FF4E" />
              {/* stand */}
              <rect x="250" y="210" width="20" height="26" fill="#26262F" />
              <rect x="228" y="234" width="64" height="8" rx="4" fill="#33333E" />
            </g>

            {/* ---- NOTEBOOK ---- */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHot("notebook")}
              onMouseLeave={() => setHot(null)}
              onClick={() => (window.location.href = "/about")}
              style={{ transform: hot === "notebook" ? "translateY(-6px)" : "translateY(0)", transition: "transform .3s" }}
            >
              <rect x="60" y="250" width="150" height="104" rx="8" transform="rotate(-6 135 302)" fill="#F4F1EA" stroke={hot === "notebook" ? "#D0FF4E" : "#DEDACE"} strokeWidth={hot === "notebook" ? 2 : 1} />
              <g transform="rotate(-6 135 302)" opacity="0.5">
                <line x1="74" y1="272" x2="196" y2="272" stroke="#C9C5BB" strokeWidth="1" />
                <line x1="74" y1="286" x2="196" y2="286" stroke="#C9C5BB" strokeWidth="1" />
                <line x1="74" y1="300" x2="170" y2="300" stroke="#C9C5BB" strokeWidth="1" />
                <rect x="150" y="312" width="40" height="26" rx="3" fill="none" stroke="#8A877F" strokeWidth="1" />
                <path d="M150 325 L170 318 L190 330" fill="none" stroke="#5B3DF5" strokeWidth="1.5" />
              </g>
            </g>

            {/* ---- PHONE ---- */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHot("phone")}
              onMouseLeave={() => setHot(null)}
              onClick={() => (window.location.href = "/contact")}
              style={{ transform: hot === "phone" ? "translateY(-6px)" : "translateY(0)", transition: "transform .3s" }}
            >
              <rect x="392" y="250" width="70" height="112" rx="12" transform="rotate(8 427 306)" fill="#0B0B0F" stroke={hot === "phone" ? "#D0FF4E" : "#33333E"} strokeWidth={hot === "phone" ? 2 : 1} />
              <g transform="rotate(8 427 306)">
                <text x="427" y="298" textAnchor="middle" fill="#F4F1EA" fontSize="18" fontFamily="monospace">{time}</text>
                <text x="427" y="314" textAnchor="middle" fill="#8A877F" fontSize="7" fontFamily="monospace" letterSpacing="1">ISLAMABAD</text>
                <circle cx="427" cy="336" r="3" fill="#D0FF4E" />
              </g>
            </g>

            {/* ---- MUG (just a mug) ---- */}
            <g>
              <g className="steam" stroke="#8A877F" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5">
                <path d="M96 150 q6 -8 0 -16" />
                <path d="M108 150 q6 -8 0 -16" />
              </g>
              <rect x="82" y="150" width="42" height="40" rx="6" fill="#1B1B22" stroke="#33333E" />
              <path d="M124 158 q14 0 14 12 t-14 12" fill="none" stroke="#33333E" strokeWidth="3" />
              <ellipse cx="103" cy="150" rx="21" ry="5" fill="#0B0B0F" stroke="#33333E" />
              <ellipse cx="103" cy="150" rx="14" ry="3" fill="#2A1A0E" />
            </g>

            {/* ---- PEN ---- */}
            <rect x="250" y="300" width="120" height="7" rx="3.5" transform="rotate(-14 310 303)" fill="#D0FF4E" />
            <rect x="352" y="300" width="16" height="7" rx="2" transform="rotate(-14 310 303)" fill="#0B0B0F" />
          </svg>
        </div>
      </div>
    </section>
  );
}
