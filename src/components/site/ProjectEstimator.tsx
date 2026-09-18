"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Code2,
  Globe,
  Smartphone,
  Bot,
  ShoppingCart,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Sparkles,
  BarChart3,
  Languages,
  Zap,
  Check,
  ArrowRight,
  Send,
  Calendar,
  Layers,
  Clock,
  Coins,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Currency = "USD" | "EUR" | "GBP" | "AED" | "PKR";

const CURRENCY_RATES: Record<Currency, { symbol: string; rate: number; label: string }> = {
  USD: { symbol: "$", rate: 1, label: "USD ($)" },
  EUR: { symbol: "€", rate: 0.92, label: "EUR (€)" },
  GBP: { symbol: "£", rate: 0.79, label: "GBP (£)" },
  AED: { symbol: "AED ", rate: 3.67, label: "AED (د.إ)" },
  PKR: { symbol: "Rs. ", rate: 280, label: "PKR (₨)" },
};

type ProjectType = {
  id: string;
  title: string;
  desc: string;
  baseUsd: number;
  baseWeeks: number;
  icon: any;
  popular?: boolean;
};

const PROJECT_TYPES: ProjectType[] = [
  {
    id: "saas",
    title: "Web App / SaaS Platform",
    desc: "Scalable cloud application with user accounts, database architecture, and subscription flows.",
    baseUsd: 3800,
    baseWeeks: 4,
    icon: Code2,
    popular: true,
  },
  {
    id: "website",
    title: "High-Conversion Web & Brand",
    desc: "Bespoke marketing experience engineered for top-tier aesthetics, high speed, and high conversion.",
    baseUsd: 2200,
    baseWeeks: 2,
    icon: Globe,
  },
  {
    id: "mobile",
    title: "Cross-Platform Mobile App",
    desc: "Native-feel iOS and Android application with synchronized real-time backend.",
    baseUsd: 4600,
    baseWeeks: 5,
    icon: Smartphone,
  },
  {
    id: "ai",
    title: "AI Agent & Custom LLM System",
    desc: "Intelligent autonomous workflows, custom embeddings/RAG, and automated operational agents.",
    baseUsd: 3200,
    baseWeeks: 3,
    icon: Bot,
    popular: true,
  },
  {
    id: "ecommerce",
    title: "Custom E-Commerce Engine",
    desc: "Headless shopping experience, custom checkout flows, inventory hooks, and international gateways.",
    baseUsd: 3000,
    baseWeeks: 3,
    icon: ShoppingCart,
  },
  {
    id: "enterprise",
    title: "Internal Portal & ERP Tool",
    desc: "Bespoke operations dashboard, team timesheets, permission hierarchies, and CRM workflow engine.",
    baseUsd: 4200,
    baseWeeks: 4,
    icon: Layers,
  },
];

type FeatureOption = {
  id: string;
  title: string;
  desc: string;
  priceUsd: number;
  icon: any;
};

const FEATURE_OPTIONS: FeatureOption[] = [
  {
    id: "auth",
    title: "User Auth & Roles (RBAC)",
    desc: "OAuth (Google, GitHub), magic links, multi-tenant permissions, and session protection.",
    priceUsd: 450,
    icon: ShieldCheck,
  },
  {
    id: "payments",
    title: "Stripe & Subscriptions",
    desc: "Checkout sessions, usage-based billing, customer portal, invoices, and webhook sync.",
    priceUsd: 650,
    icon: CreditCard,
  },
  {
    id: "chat",
    title: "Real-time Chat & Activity",
    desc: "WebSocket-powered instant messaging, typing indicators, and presence indicators.",
    priceUsd: 750,
    icon: MessageSquare,
  },
  {
    id: "ai_integration",
    title: "Custom AI / LLM Feature",
    desc: "Smart suggestions, automated document summarization, vector search, or natural chat.",
    priceUsd: 950,
    icon: Sparkles,
  },
  {
    id: "analytics",
    title: "Live Metrics & Dashboards",
    desc: "Interactive charts, KPI summaries, CSV export, and scheduled management summaries.",
    priceUsd: 550,
    icon: BarChart3,
  },
  {
    id: "i18n",
    title: "Multi-Language & i18n",
    desc: "Seamless translation routing, localized formatting, and currency toggles.",
    priceUsd: 400,
    icon: Languages,
  },
  {
    id: "integrations",
    title: "Third-Party API Integrations",
    desc: "Direct two-way synchronization with HubSpot, Salesforce, Slack, QuickBooks, or Zapier.",
    priceUsd: 600,
    icon: Zap,
  },
];

type DesignTier = {
  id: string;
  title: string;
  desc: string;
  multiplier: number;
};

const DESIGN_TIERS: DesignTier[] = [
  {
    id: "mvp",
    title: "Clean Modern Architecture",
    desc: "Tailwind UI system with polished typography and accessible, clean UX.",
    multiplier: 1.0,
  },
  {
    id: "bespoke",
    title: "Bespoke Signature Craft",
    desc: "Custom Figma design system, distinct branding touches, and tailored micro-interactions.",
    multiplier: 1.25,
  },
  {
    id: "award",
    title: "Cutting-Edge / Award-Grade",
    desc: "Kinetic animations, glassmorphic lighting, 3D interactive accents, and high-prestige feel.",
    multiplier: 1.5,
  },
];

type UrgencyTier = {
  id: string;
  title: string;
  desc: string;
  timeReduction: number;
  multiplier: number;
};

const URGENCY_TIERS: UrgencyTier[] = [
  {
    id: "standard",
    title: "Standard Pace",
    desc: "Methodical agile milestones with weekly reviews and dedicated QA cycles.",
    timeReduction: 0,
    multiplier: 1.0,
  },
  {
    id: "fast",
    title: "Fast-Track Sprint (~30% faster)",
    desc: "High-priority engineering bandwidth to meet impending launch dates or investor demos.",
    timeReduction: 1.5,
    multiplier: 1.25,
  },
];

export default function ProjectEstimator() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [selectedType, setSelectedType] = useState<string>("saas");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(["auth", "payments"]);
  const [selectedDesign, setSelectedDesign] = useState<string>("bespoke");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("standard");

  // Lead Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });

  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Calculations
  const estimate = useMemo(() => {
    const typeObj = PROJECT_TYPES.find((t) => t.id === selectedType) || PROJECT_TYPES[0];
    const designObj = DESIGN_TIERS.find((d) => d.id === selectedDesign) || DESIGN_TIERS[0];
    const urgencyObj = URGENCY_TIERS.find((u) => u.id === selectedUrgency) || URGENCY_TIERS[0];

    const featuresCost = selectedFeatures.reduce((acc, fId) => {
      const feat = FEATURE_OPTIONS.find((f) => f.id === fId);
      return acc + (feat ? feat.priceUsd : 0);
    }, 0);

    const rawSubtotal = (typeObj.baseUsd + featuresCost) * designObj.multiplier * urgencyObj.multiplier;
    const lowUsd = Math.round(rawSubtotal * 0.9);
    const highUsd = Math.round(rawSubtotal * 1.15);

    // Timeline calculation in weeks
    const addedWeeks = Math.round(selectedFeatures.length * 0.35);
    const totalWeeks = Math.max(2, Math.round((typeObj.baseWeeks + addedWeeks) / (urgencyObj.timeReduction > 0 ? 1.4 : 1)));

    const rate = CURRENCY_RATES[currency].rate;
    const symbol = CURRENCY_RATES[currency].symbol;

    const fmt = (amount: number) => {
      const converted = Math.round(amount * rate);
      return `${symbol}${converted.toLocaleString()}`;
    };

    return {
      typeObj,
      designObj,
      urgencyObj,
      lowFormatted: fmt(lowUsd),
      highFormatted: fmt(highUsd),
      lowUsd,
      highUsd,
      weeks: totalWeeks,
    };
  }, [selectedType, selectedFeatures, selectedDesign, selectedUrgency, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Please enter your name and email address.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        phone: form.phone.trim() || undefined,
        budget_range: `${estimate.lowFormatted} – ${estimate.highFormatted} (${currency})`,
        timeline: `~${estimate.weeks} weeks (${estimate.urgencyObj.title})`,
        service_slugs: [estimate.typeObj.id, ...selectedFeatures],
        message: [
          `[ESTIMATOR SCOPE BREAKDOWN]`,
          `• Project Type: ${estimate.typeObj.title}`,
          `• Design Tier: ${estimate.designObj.title}`,
          `• Pace: ${estimate.urgencyObj.title}`,
          `• Selected Features: ${selectedFeatures.map((f) => FEATURE_OPTIONS.find((fo) => fo.id === f)?.title).filter(Boolean).join(", ")}`,
          `• Estimated Investment: ${estimate.lowFormatted} – ${estimate.highFormatted} (${currency})`,
          `• Estimated Delivery: ~${estimate.weeks} weeks`,
          form.message ? `\nClient Notes: ${form.message.trim()}` : "",
        ].filter(Boolean).join("\n"),
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit estimate.");
      }

      setSubmitted(true);
      toast.success("Estimate received! We'll review your scope and follow up promptly.");
    } catch (err: any) {
      toast.error(err.message || "Could not submit your estimate. Please reach out via WhatsApp or email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_430px]">
      {/* ── Left Interactive Options Column ───────────────────── */}
      <div className="space-y-12">
        {/* Step 1: Project Type */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-ink-950">
                1
              </span>
              <h2 className="text-lg font-semibold text-bone-100">
                Select Your Project Foundation
              </h2>
            </div>
            <span className="text-xs text-bone-400 font-mono">Step 1 of 4</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {PROJECT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-xl border p-4.5 text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-lime-400 bg-lime-400/[0.06] shadow-lg shadow-lime-400/5 ring-1 ring-lime-400/40"
                      : "border-ink-600/80 bg-ink-850/60 hover:border-ink-500 hover:bg-ink-800/80"
                  )}
                >
                  {type.popular && (
                    <span className="absolute right-3 top-3 rounded-full border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-300">
                      Popular
                    </span>
                  )}
                  <div className="space-y-2">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                        isSelected
                          ? "border-lime-400/40 bg-lime-400/20 text-lime-300"
                          : "border-ink-700 bg-ink-800 text-bone-400 group-hover:text-bone-200"
                      )}
                    >
                      <Icon size={18} />
                    </div>
                    <h3
                      className={cn(
                        "text-sm font-semibold transition-colors",
                        isSelected ? "text-lime-300" : "text-bone-100"
                      )}
                    >
                      {type.title}
                    </h3>
                    <p className="text-xs text-bone-400 leading-relaxed">{type.desc}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-ink-700/60 pt-3 text-[11px] font-mono text-bone-400">
                    <span>Base baseline: ~{type.baseWeeks}w</span>
                    <span className={isSelected ? "text-lime-400 font-bold" : ""}>
                      {CURRENCY_RATES[currency].symbol}
                      {Math.round(type.baseUsd * CURRENCY_RATES[currency].rate).toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Core Capabilities */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-ink-950">
                2
              </span>
              <h2 className="text-lg font-semibold text-bone-100">
                Choose Key Architecture & Modules
              </h2>
            </div>
            <span className="text-xs text-bone-400 font-mono">
              {selectedFeatures.length} selected
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURE_OPTIONS.map((feat) => {
              const Icon = feat.icon;
              const isChecked = selectedFeatures.includes(feat.id);

              return (
                <div
                  key={feat.id}
                  onClick={() => toggleFeature(feat.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 transition-all cursor-pointer select-none",
                    isChecked
                      ? "border-lime-400/80 bg-lime-400/[0.05] ring-1 ring-lime-400/30"
                      : "border-ink-600/70 bg-ink-850/50 hover:border-ink-500 hover:bg-ink-800/60"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                      isChecked
                        ? "border-lime-400 bg-lime-400 text-ink-950 font-bold"
                        : "border-ink-600 bg-ink-800"
                    )}
                  >
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={cn(
                          "text-xs font-semibold",
                          isChecked ? "text-bone-50" : "text-bone-200"
                        )}
                      >
                        {feat.title}
                      </h3>
                      <span className="font-mono text-[10px] text-bone-400">
                        +{CURRENCY_RATES[currency].symbol}
                        {Math.round(feat.priceUsd * CURRENCY_RATES[currency].rate).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-bone-400 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 3: Design & Craftsmanship */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-ink-950">
                3
              </span>
              <h2 className="text-lg font-semibold text-bone-100">
                Design & Motion Aesthetics
              </h2>
            </div>
            <span className="text-xs text-bone-400 font-mono">Step 3 of 4</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {DESIGN_TIERS.map((tier) => {
              const isSelected = selectedDesign === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedDesign(tier.id)}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-lime-400 bg-lime-400/[0.06] ring-1 ring-lime-400/30"
                      : "border-ink-600/70 bg-ink-850/50 hover:border-ink-500 hover:bg-ink-800/60"
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isSelected ? "text-lime-300" : "text-bone-100"
                        )}
                      >
                        {tier.title}
                      </span>
                      {isSelected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-lime-400 text-ink-950">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-bone-400 leading-relaxed">{tier.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 4: Speed & Launch Urgency */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-ink-950">
                4
              </span>
              <h2 className="text-lg font-semibold text-bone-100">Delivery Velocity</h2>
            </div>
            <span className="text-xs text-bone-400 font-mono">Step 4 of 4</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {URGENCY_TIERS.map((tier) => {
              const isSelected = selectedUrgency === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedUrgency(tier.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-lime-400 bg-lime-400/[0.06] ring-1 ring-lime-400/30"
                      : "border-ink-600/70 bg-ink-850/50 hover:border-ink-500 hover:bg-ink-800/60"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isSelected ? "border-lime-400 bg-lime-400 text-ink-950" : "border-ink-600"
                    )}
                  >
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-ink-950" />}
                  </div>
                  <div className="space-y-1">
                    <h3
                      className={cn(
                        "text-xs font-semibold",
                        isSelected ? "text-lime-300" : "text-bone-100"
                      )}
                    >
                      {tier.title}
                    </h3>
                    <p className="text-[11px] text-bone-400 leading-relaxed">{tier.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── Right Fixed Scope & Quotation Summary ─────────────── */}
      <div className="lg:sticky lg:top-24 h-fit space-y-4">
        <div className="rounded-2xl border border-ink-600/90 bg-ink-850/90 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Header & Currency Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700/80 pb-4">
            <div>
              <span className="mono-tag text-[10px] uppercase tracking-wider text-lime-400">
                Instant Calculation
              </span>
              <h3 className="text-base font-semibold text-bone-50">Estimated Scope</h3>
            </div>

            {/* Currency Pill Selector */}
            <div className="flex shrink-0 overflow-x-auto no-scrollbar rounded-lg border border-ink-700 bg-ink-900/90 p-0.5">
              {(Object.keys(CURRENCY_RATES) as Currency[]).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setCurrency(cur)}
                  className={cn(
                    "rounded px-2 py-1 text-[10px] font-mono font-bold transition-all cursor-pointer",
                    currency === cur
                      ? "bg-lime-400 text-ink-950 shadow-sm"
                      : "text-bone-400 hover:text-bone-100"
                  )}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {/* Big Range Display */}
          <div className="space-y-2 text-center py-3 rounded-xl bg-ink-900/60 border border-ink-700/60">
            <span className="text-[11px] font-mono text-bone-400 uppercase tracking-wider">
              Ballpark Investment Range
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-bone-50 tracking-tight">
              <span className="text-lime-400">{estimate.lowFormatted}</span>
              <span className="text-bone-500 font-normal px-2">—</span>
              <span className="text-bone-50">{estimate.highFormatted}</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-bone-300 font-mono pt-1">
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-lime-400" />
                ~{estimate.weeks} weeks delivery
              </span>
              <span>•</span>
              <span className="text-bone-400">Fixed-price guarantee</span>
            </div>
          </div>

          {/* Itemized Specification List */}
          <div className="space-y-2.5 text-xs text-bone-300 border-t border-ink-700/70 pt-4">
            <span className="mono-tag text-[10px] text-bone-500 uppercase tracking-wider">
              Included Specifications:
            </span>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li className="flex items-center justify-between">
                <span className="text-bone-200">Architecture:</span>
                <span className="text-bone-100 font-medium">{estimate.typeObj.title}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-bone-200">Design Tier:</span>
                <span className="text-bone-100">{estimate.designObj.title}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-bone-200">Velocity:</span>
                <span className="text-bone-100">{estimate.urgencyObj.title}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-bone-200">Add-on Modules:</span>
                <span className="text-lime-300 font-semibold">{selectedFeatures.length} selected</span>
              </li>
            </ul>
          </div>

          {/* Submission / Lead Capture Form */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-ink-700/70">
              <span className="mono-tag text-[10px] text-bone-400 uppercase tracking-wider block">
                Lock In This Estimate:
              </span>

              <div className="space-y-2">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name *"
                  className="w-full rounded-lg border border-ink-600 bg-ink-900/80 px-3 py-2 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
                />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Work email address *"
                  className="w-full rounded-lg border border-ink-600 bg-ink-900/80 px-3 py-2 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Company / Project"
                    className="w-full rounded-lg border border-ink-600 bg-ink-900/80 px-3 py-2 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
                  />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="WhatsApp / Phone"
                    className="w-full rounded-lg border border-ink-600 bg-ink-900/80 px-3 py-2 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
                  />
                </div>
                <textarea
                  rows={2}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Any specific goals or links? (Optional)"
                  className="w-full rounded-lg border border-ink-600 bg-ink-900/80 px-3 py-2 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full h-10 gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span>Recording Estimate…</span>
                ) : (
                  <>
                    <span>Lock In Estimate & Request Brief</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-lime-400/40 bg-lime-400/10 p-4 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-lime-400 text-ink-950 font-bold">
                <CheckCircle2 size={20} />
              </div>
              <h4 className="text-sm font-semibold text-bone-50">Estimate Locked!</h4>
              <p className="text-xs text-bone-300 leading-relaxed">
                We received your specification breakdown. Our lead engineer is reviewing your
                scope and will respond within <strong>1 business day</strong> with an itemized
                deliverables plan.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <a
                  href="https://calendly.com/ahmadsadiq-dev/free-strategy-call"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary h-9 text-xs w-full"
                >
                  Book 20-Min Strategy Call on Calendly →
                </a>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mono-tag text-[11px] text-bone-400 hover:text-bone-200 cursor-pointer pt-1"
                >
                  Adjust specifications
                </button>
              </div>
            </div>
          )}

          {/* Reassurance Footer */}
          <div className="flex items-center justify-between text-[11px] text-bone-400 font-mono border-t border-ink-700/60 pt-3">
            <span>✓ 100% IP Ownership</span>
            <span>✓ Milestone Escrow</span>
            <span>✓ Zero Obligation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
