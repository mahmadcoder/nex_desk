"use client";

import { Layers, Lightbulb, Code2, Rocket, CheckCircle2 } from "lucide-react";

import type { ProcessStep } from "@/types/site";
export type { ProcessStep };

import { SERVICE_FALLBACK_PROCESS } from "@/config/siteContent";

export default function ServiceProcessRoadmap({
  steps,
}: {
  steps?: ProcessStep[];
}) {
  const defaultSteps: ProcessStep[] = SERVICE_FALLBACK_PROCESS;

  const activeSteps = steps && steps.length >= 4 ? steps : defaultSteps;

  const icons = [Lightbulb, Layers, Code2, Rocket];

  return (
    <div className="space-y-8" id="delivery-process">
      <div className="text-center max-w-2xl mx-auto">
        <span className="mono-tag text-lime-400 bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/20 inline-flex items-center gap-1.5 mb-3">
          <CheckCircle2 size={13} /> 4-Phase Delivery Methodology
        </span>
        <h2 className="text-2xl sm:text-3xl font-semibold text-bone-50">
          How we execute your project from A to Z
        </h2>
        <p className="mt-2 text-sm text-bone-300">
          A structured, milestone-driven engineering process designed for transparency, speed, and clean code.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {activeSteps.map((step, idx) => {
          const StepIcon = icons[idx % icons.length];
          return (
            <div
              key={step.step_no}
              className="card p-6 border-ink-600 bg-ink-900/60 flex flex-col justify-between space-y-4 hover:border-lime-400/40 transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-lime-400/40 group-hover:text-lime-400 transition-colors">
                    {step.step_no}
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-ink-800 border border-ink-700 text-lime-400 flex items-center justify-center">
                    <StepIcon size={18} />
                  </div>
                </div>

                <h3 className="mt-4 text-base font-semibold text-bone-50 group-hover:text-lime-400 transition-colors">
                  {step.title}
                </h3>

                <p className="mt-2 text-xs text-bone-300 leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="pt-3 border-t border-ink-700/60 text-[10px] mono-tag text-bone-400">
                Phase {idx + 1} Milestone
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
