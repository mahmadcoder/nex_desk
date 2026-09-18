import type { Metadata } from "next";
import ProjectEstimator from "@/components/site/ProjectEstimator";

export const metadata: Metadata = {
  title: "Project Scope & Cost Estimator | Nex Desk",
  description:
    "Calculate your digital product scope, ballpark investment, and delivery timeline in under 60 seconds. Instant fixed-price estimates with full IP ownership.",
  openGraph: {
    title: "Project Scope & Cost Estimator | Nex Desk",
    description:
      "Interactive 60-second digital product budget calculator for SaaS, web apps, mobile, and custom AI systems.",
  },
};

export default function EstimatePage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="shell space-y-10">
        {/* Header Hero */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-lime-300">
            <span>Interactive Scope Builder</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-medium tracking-tight text-bone-50 leading-[1.15]">
            Estimate your project scope & investment in{" "}
            <span className="text-lime-400">60 seconds.</span>
          </h1>

          <p className="text-base sm:text-lg text-bone-300 leading-relaxed max-w-2xl">
            No sales runaround. Select your architectural foundation, core capabilities,
            and timeline to generate an immediate, realistic investment range backed by
            our fixed-price delivery guarantee.
          </p>
        </div>

        {/* Interactive Estimator Core */}
        <ProjectEstimator />
      </div>
    </div>
  );
}
