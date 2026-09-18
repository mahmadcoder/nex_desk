import type { Metadata } from "next";
import CallScheduler from "@/components/site/CallScheduler";

export const metadata: Metadata = {
  title: "Book a 20-Minute Strategy Call | Nex Desk",
  description:
    "Schedule a private 20-minute technical roadmap and architecture consultation with our engineering team. Transparent scope, zero sales pressure.",
  openGraph: {
    title: "Book a 20-Minute Strategy Call | Nex Desk",
    description: "Private technical discovery call with the Nex Desk engineering team.",
  },
};

export default function BookPage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="shell space-y-10">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-lime-300">
            <span>Direct Access</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-medium tracking-tight text-bone-50 leading-[1.15]">
            Book a 20-minute{" "}
            <span className="text-lime-400">architecture call.</span>
          </h1>

          <p className="text-base sm:text-lg text-bone-300 leading-relaxed max-w-2xl">
            Pick a convenient time slot in your timezone. We’ll review your project goals,
            advise on technical feasibility, and discuss realistic timelines and fixed-price milestones.
          </p>
        </div>

        <CallScheduler />
      </div>
    </div>
  );
}
