"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import Reveal from "./Reveal";

/**
 * The paper trail.
 * Displays real document mockups with 3D hover response & scroll fan-out.
 */

const PAPER = "#FBFAF6";
const INK = "#0B0B0F";
const RULE = "#DEDACE";
const MUTED = "#75736C";
const LIME = "#D0FF4E";

function Line({ w = "100%" }: { w?: string }) {
  return <div className="h-1 rounded-full" style={{ width: w, background: RULE }} />;
}

function PaperHead({ type }: { type: string }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: INK }} />
          <span className="text-[7px] font-semibold tracking-tight" style={{ color: INK }}>
            Nex Desk
          </span>
        </span>
        <span className="text-[6px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>
          {type}
        </span>
      </div>
      <div className="mt-2 h-px" style={{ background: INK }} />
    </>
  );
}

function Paper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex aspect-[3/4] w-full flex-col rounded-[3px] p-3.5 shadow-2xl ring-1 ring-black/20"
      style={{ background: PAPER }}
    >
      {children}
    </div>
  );
}

function Agreement() {
  return (
    <Paper>
      <PaperHead type="agreement" />
      <p className="mt-3 text-[9px] font-semibold leading-tight" style={{ color: INK }}>
        Project agreement
      </p>
      <div className="mt-2.5 space-y-1.5">
        <Line w="90%" />
        <Line w="75%" />
        <Line w="85%" />
      </div>
      <div className="mt-3 space-y-1 rounded-[2px] p-1.5" style={{ background: "#F1EEE4" }}>
        <div className="flex justify-between">
          <span className="h-1 w-8 rounded-full" style={{ background: RULE }} />
          <span className="text-[7px] font-semibold" style={{ color: INK }}>$4,000</span>
        </div>
        <div className="flex justify-between">
          <span className="h-1 w-10 rounded-full" style={{ background: RULE }} />
          <span className="h-1 w-5 rounded-full" style={{ background: RULE }} />
        </div>
      </div>
      <div className="mt-auto">
        <div className="h-px" style={{ background: INK }} />
        <div className="mt-1 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: LIME }} />
          <span className="text-[6px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
            signed
          </span>
        </div>
      </div>
    </Paper>
  );
}

function Receipt() {
  return (
    <Paper>
      <PaperHead type="receipt" />
      <div className="mt-4 text-center">
        <p className="text-[6px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
          amount received
        </p>
        <p className="mt-0.5 text-[15px] font-semibold leading-none tracking-tight" style={{ color: INK }}>
          $2,000
        </p>
      </div>
      <span
        className="mx-auto mt-3 rounded-full px-2 py-0.5 text-[6px] font-semibold uppercase tracking-[0.12em]"
        style={{ background: LIME, color: "#2A3A00" }}
      >
        paid
      </span>
      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between">
          <span className="h-1 w-7 rounded-full" style={{ background: RULE }} />
          <span className="h-1 w-9 rounded-full" style={{ background: RULE }} />
        </div>
        <div className="flex justify-between">
          <span className="h-1 w-9 rounded-full" style={{ background: RULE }} />
          <span className="h-1 w-6 rounded-full" style={{ background: RULE }} />
        </div>
      </div>
      <div className="mt-auto flex justify-between border-t pt-1.5" style={{ borderColor: RULE }}>
        <span className="text-[6px]" style={{ color: MUTED }}>balance</span>
        <span className="text-[7px] font-semibold" style={{ color: INK }}>$2,000</span>
      </div>
    </Paper>
  );
}

function Progress() {
  return (
    <Paper>
      <PaperHead type="progress" />
      <div className="mt-3 flex items-end justify-between">
        <span className="text-[6px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
          complete
        </span>
        <span className="text-[13px] font-semibold leading-none tracking-tight" style={{ color: INK }}>
          62%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "#E4E0D4" }}>
        <div className="h-full rounded-full" style={{ width: "62%", background: LIME }} />
      </div>
      <div className="mt-3 space-y-1.5">
        {[true, true, false, false].map((done, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: done ? LIME : "transparent", border: done ? "none" : `1px solid ${RULE}` }}
            />
            <span className="h-1 flex-1 rounded-full" style={{ background: RULE }} />
          </div>
        ))}
      </div>
    </Paper>
  );
}

function Handover() {
  return (
    <Paper>
      <PaperHead type="handover" />
      <p className="mt-3 text-[9px] font-semibold leading-tight" style={{ color: INK }}>
        Handover certificate
      </p>
      <div className="mt-2.5 space-y-1.5">
        <Line w="80%" />
        <Line w="65%" />
      </div>
      <div className="mt-3 space-y-1">
        {["source code", "credentials", "domains"].map((row) => (
          <div key={row} className="flex items-center gap-1.5">
            <span className="text-[6px]" style={{ color: LIME }}>✓</span>
            <span className="text-[6px]" style={{ color: MUTED }}>{row}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex justify-center">
        <span
          className="grid h-10 w-10 rotate-[-8deg] place-items-center rounded-full text-center text-[5px] font-semibold uppercase leading-[1.1] tracking-[0.08em]"
          style={{ border: `1.5px solid ${LIME}`, color: "#5E7A0A" }}
        >
          you
          <br />
          own it
        </span>
      </div>
    </Paper>
  );
}

const DOCS = [
  {
    when: "day 0",
    title: "Agreement",
    body: "Scope, deliverables, price, payment schedule and terms — signed before a line of code is written.",
    tilt: "-rotate-2",
    art: <Agreement />,
  },
  {
    when: "on payment",
    title: "Receipt",
    body: "Date, method, transaction reference and the balance remaining. Sent the moment a payment lands.",
    tilt: "rotate-1",
    art: <Receipt />,
  },
  {
    when: "every week",
    title: "Progress report",
    body: "Milestones ticked off, percentage complete, and what we're waiting on from you.",
    tilt: "-rotate-1",
    art: <Progress />,
  },
  {
    when: "launch day",
    title: "Handover",
    body: "Every credential, where the source lives, warranty terms. Ownership transfers to you in writing.",
    tilt: "rotate-2",
    art: <Handover />,
  },
];

export default function PaperTrail() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardIndex: number) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(card, {
      rotateY: x * 0.08,
      rotateX: -y * 0.08,
      y: -6,
      duration: 0.4,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      rotateY: 0,
      rotateX: 0,
      y: 0,
      duration: 0.6,
      ease: "power3.out",
    });
  };

  return (
    <section className="shell py-28">
      <div className="max-w-2xl">
        <p className="drawer-label">Why us</p>
        <h2 className="mt-6 text-[var(--text-h2)]">Everything gets written down.</h2>
        <p className="mt-5 text-bone-400">
          Not a promise about how organised we are — the actual paperwork. Every project
          generates these automatically and emails them to you. They&apos;re in your portal
          from day one, and they&apos;re why nobody argues at the end.
        </p>
      </div>

      <Reveal direction="up" distance={36} stagger={0.12} className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {DOCS.map((d, i) => (
          <div
            key={d.title}
            className="group [perspective:1000px]"
            onMouseMove={(e) => handleMouseMove(e, i)}
            onMouseLeave={handleMouseLeave}
          >
            <div className={`${d.tilt} transition-transform duration-500 ease-out group-hover:rotate-0`}>
              {d.art}
            </div>
            <div className="mt-7">
              <span className="mono-tag text-lime-400">{d.when}</span>
              <h3 className="mt-2 text-xl font-medium text-bone-50">{d.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-bone-400">{d.body}</p>
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}