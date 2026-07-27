"use client";

import Link from "next/link";
import { Check, Zap, Sparkles, ShieldCheck } from "lucide-react";

import type { PricingTier } from "@/types/site";
export type { PricingTier };

import { getServiceFallbackTiers } from "@/config/siteContent";

export default function ServicePricingTiers({
  serviceSlug,
  serviceTitle,
  tiers,
  startingAt,
  currency = "USD",
}: {
  serviceSlug: string;
  serviceTitle: string;
  tiers?: PricingTier[];
  startingAt?: number;
  currency?: string;
}) {
  // Standard fallback tiers if custom ones are not provided
  const defaultTiers: PricingTier[] = getServiceFallbackTiers(startingAt);

  const activeTiers = tiers && tiers.length >= 3 ? tiers : defaultTiers;

  return (
    <div className="space-y-8" id="pricing-tiers">
      <div className="text-center max-w-2xl mx-auto">
        <p className="drawer-label justify-center">Investment Packages</p>
        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-bone-50">
          Choose the right package for your project
        </h2>
        <p className="mt-2 text-sm text-bone-300">
          Fixed written quotes with zero hidden fees. Select a package below to pre-fill your inquiry form.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        {activeTiers.map((tier) => {
          const targetUrl = `/contact?service=${encodeURIComponent(serviceSlug)}&package=${encodeURIComponent(tier.key)}&tier_name=${encodeURIComponent(tier.name)}&price=${encodeURIComponent(tier.price ? `${currency === "USD" ? "$" : ""}${tier.price.toLocaleString()}` : "Custom")}`;

          return (
            <div
              key={tier.key}
              className={`card relative p-7 flex flex-col justify-between transition-all duration-200 ${
                tier.is_popular
                  ? "border-lime-400 bg-ink-900/90 shadow-[0_0_30px_rgba(208,255,78,0.12)] sm:-translate-y-2"
                  : "border-ink-600 bg-ink-900/60 hover:border-ink-500"
              }`}
            >
              {tier.is_popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="mono-tag bg-lime-400 text-ink-950 font-bold px-3 py-1 rounded-full text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Sparkles size={12} /> Most Popular Choice
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-bone-50">{tier.name}</h3>
                  <span className="mono-tag text-[10px] text-bone-400">{tier.delivery_time}</span>
                </div>

                <p className="mt-2 text-xs text-bone-300 min-h-[36px]">{tier.short_desc}</p>

                <div className="mt-5 my-4">
                  <p className="text-3xl font-bold text-bone-50 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                    {tier.price_label}
                  </p>
                  <p className="mt-1 text-[11px] text-bone-400">
                    {tier.price ? "Fixed price · 100% written scope guarantee" : "Custom quote based on team size"}
                  </p>
                </div>

                <ul className="mt-6 space-y-3">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs text-bone-200">
                      <span className="h-4 w-4 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href={targetUrl}
                  className={`btn w-full justify-center h-10 text-xs font-semibold cursor-pointer ${
                    tier.is_popular ? "btn-primary shadow-lg" : "bg-ink-800 text-bone-100 border-ink-600 hover:bg-ink-700 hover:text-bone-50"
                  }`}
                >
                  {tier.cta_text} →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
