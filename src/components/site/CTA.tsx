"use client";

import Link from "next/link";
import Reveal from "./Reveal";
import Magnetic from "./Magnetic";

/**
 * Centered CTA — clean, symmetrical with magnetic interaction & reveal animation.
 */
export default function CTA() {
  return (
    <section className="shell py-10">
      <Reveal direction="zoom" distance={24}>
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-8 py-20 text-center sm:px-16">

          {/* subtle grid texture overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(var(--color-bone-400) 1px, transparent 1px), linear-gradient(90deg, var(--color-bone-400) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* lime glow blob */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-56 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-400 opacity-[0.14] blur-3xl animate-pulse"
          />

          {/* label */}
          <p className="drawer-label relative">Next step</p>

          {/* headline */}
          <h2
            className="relative mt-6 mx-auto max-w-2xl"
            style={{
              fontSize: "var(--text-h2)",
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              letterSpacing: "-0.035em",
              lineHeight: 1.1,
              textAlign: "center",
              textWrap: "pretty",
              margin: "1.5rem auto 0",
            }}
          >
            Tell us what you&apos;re building.{" "}
            <span className="text-lime-400">We&apos;ll handle the rest.</span>
          </h2>

          {/* sub-copy */}
          <p className="relative mt-5 mx-auto max-w-md text-bone-400">
            No sales sequence, no discovery-call funnel. One message, one honest
            reply, and a written quote if it&apos;s a fit.
          </p>

          {/* stat pills */}
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              "60+ Projects shipped",
              "~4 wk avg. delivery",
              "< 1 day reply",
            ].map((stat) => (
              <span
                key={stat}
                className="rounded-full border border-ink-600 bg-ink-950 px-4 py-1.5 text-xs font-medium tracking-wide text-bone-300"
              >
                {stat}
              </span>
            ))}
          </div>

          {/* buttons */}
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
            <Magnetic strength={0.25}>
              <Link href="/contact" className="btn btn-primary">
                Start a project
              </Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <Link href="/pricing" className="btn">
                See pricing
              </Link>
            </Magnetic>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
