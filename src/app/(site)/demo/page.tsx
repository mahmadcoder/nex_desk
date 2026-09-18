"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  FileUp,
  Receipt,
  LifeBuoy,
  MessageSquare,
  Calendar,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Download,
  Eye,
  Check,
  TrendingUp,
  Loader2,
  X,
  Plus,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DemoTab = "overview" | "milestones" | "files" | "tickets" | "invoices";

type MockTicket = {
  id: string;
  subject: string;
  status: string;
  statusTone: "resolved" | "active";
  reply: string;
  by: string;
};

export default function DemoPortalPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>("overview");
  const [approvedMilestones, setApprovedMilestones] = useState<string[]>(["m1"]);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // Dynamic Tickets state for interactive simulation
  const [tickets, setTickets] = useState<MockTicket[]>([
    {
      id: "TICK-104",
      subject: "Add WAV 24-bit 96kHz export support to audio engine",
      status: "Resolved in 4h",
      statusTone: "resolved",
      reply:
        "Hi Muse team — we added 96kHz 24-bit WAV rendering to the WebAssembly engine. Tested across Chrome, Safari, and Firefox. Staging build updated.",
      by: "Lead Engineer, Nex Desk",
    },
  ]);

  // New Ticket Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newDesc, setNewDesc] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const toggleApprove = (id: string) => {
    setApprovedMilestones((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      if (!prev.includes(id)) {
        toast.success("Milestone approved! In the live portal, escrow funds for this stage are released to the engineering team.");
      }
      return next;
    });
  };

  const handleDownloadFile = (filename: string) => {
    setDownloadingFile(filename);
    setTimeout(() => {
      setDownloadingFile(null);
      // Initiate verified specimen deliverable download
      const content = `Nex Desk Agency · Deliverable Specification Specimen\n\nProject: Muse.app (Web & Audio Engine)\nArtifact: ${filename}\nStatus: QA Verified & Staged\nChecksum (SHA-256): 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08\nVerification: Verified by Lead Systems Architect\n\nIn the production Client Portal, this downloads your actual signed-off production builds, Figma backups, and Docker/source archives.\n`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.replace(/\.[a-z0-9]+$/, "") + "-deliverable-spec.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Specimen "${filename}" downloaded with verified checksum.`);
    }, 600);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) {
      toast.error("Please enter a subject for your request.");
      return;
    }

    setSubmittingTicket(true);
    setTimeout(() => {
      const newId = `TICK-${104 + tickets.length}`;
      const item: MockTicket = {
        id: newId,
        subject: newSubject.trim(),
        status: newPriority === "urgent" ? "Urgent · Assigned to On-Duty Lead" : "Assigned · In Progress",
        statusTone: "active",
        reply: newDesc.trim()
          ? `“Received: ${newDesc.trim().slice(0, 100)}...” — Initial investigation started. Target update within 4 hours.`
          : "Your request has been filed and routed to the sprint engineer. Initial review in progress.",
        by: "Lead Systems Architect, Nex Desk",
      };

      setTickets([item, ...tickets]);
      setSubmittingTicket(false);
      setRequestModalOpen(false);
      setNewSubject("");
      setNewDesc("");
      toast.success(`Request ${newId} created! In the live portal, your assigned engineer is alerted instantly.`);
      setActiveTab("tickets");
    }, 500);
  };

  return (
    <div className="min-h-screen pb-20 pt-4 sm:pt-6">
      {/* ── Demo Top Notification Bar ─────────────────────────── */}
      <div className="shell mb-6">
        <div className="relative overflow-hidden rounded-2xl border border-lime-400/40 bg-lime-400/[0.08] p-4 sm:p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400 text-ink-950 font-bold">
                <Sparkles size={16} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-lime-300">
                    Interactive Guest Sandbox
                  </span>
                  <span className="rounded-full bg-lime-400/20 px-2 py-0.2 text-[10px] font-mono text-lime-300 font-bold">
                    Live Demo Mode
                  </span>
                </div>
                <p className="text-xs text-bone-200 leading-relaxed">
                  You are exploring the private <strong>Nex Desk Client Portal</strong> for fictional client{" "}
                  <span className="text-bone-50 font-semibold">“Muse.app Audio AI”</span>. Test milestone tracking, deliverable approvals, and transparent billing.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap shrink-0 items-center gap-2 pt-1 sm:pt-0">
              <Link href="/contact" className="btn btn-primary h-9 px-4 text-xs font-semibold">
                Start Your Project
              </Link>
              <Link href="/estimate" className="btn h-9 px-3.5 text-xs">
                Cost Estimator
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="shell space-y-6">
        {/* ── Client Portal Header ───────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-ink-700/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-bone-400">
              <span>Client Portal</span>
              <span>/</span>
              <span className="text-bone-200">Muse Technologies Inc.</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-medium text-bone-50">
              Muse.app — Web & Audio Engine
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-1.5 text-right font-mono">
              <span className="text-[10px] uppercase tracking-wider text-bone-400 block">
                Sprint Status
              </span>
              <span className="text-xs font-bold text-lime-400 flex items-center gap-1.5 justify-end">
                <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
                Sprint 3 (On Schedule)
              </span>
            </div>
          </div>
        </div>

        {/* ── Portal Navigation Tabs (Mobile Horizontally Scrollable) ── */}
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto border-b border-ink-800 px-4 pb-2 sm:mx-0 sm:px-0 sm:flex-wrap">
          {[
            { id: "overview", label: "Project Pulse", icon: TrendingUp },
            { id: "milestones", label: "Milestones & Delivery", icon: CheckCircle2, badge: `${approvedMilestones.length} of 4` },
            { id: "files", label: "Deliverables & Assets", icon: FileUp, badge: "3 New" },
            { id: "tickets", label: "Support & Requests", icon: LifeBuoy, badge: `${tickets.length} Active` },
            { id: "invoices", label: "Invoicing & Escrow", icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DemoTab)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all cursor-pointer",
                  isActive
                    ? "border border-lime-400/50 bg-lime-400/10 text-lime-300 font-semibold shadow-sm"
                    : "text-bone-300 hover:bg-ink-800 hover:text-bone-100"
                )}
              >
                <Icon size={14} className={isActive ? "text-lime-400" : "text-bone-400"} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                      isActive ? "bg-lime-400/20 text-lime-300 font-bold" : "bg-ink-700 text-bone-400"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab 1: Overview / Project Pulse ────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card p-4.5 space-y-1.5">
                <span className="mono-tag text-[10px] text-bone-400 uppercase">Current Phase</span>
                <p className="text-base font-semibold text-bone-100">Milestone 2 · Core Engine</p>
                <span className="text-[11px] text-lime-400 font-mono">75% complete · On track</span>
              </div>
              <div className="card p-4.5 space-y-1.5">
                <span className="mono-tag text-[10px] text-bone-400 uppercase">Target Release</span>
                <p className="text-base font-semibold text-bone-100">Oct 14, 2026</p>
                <span className="text-[11px] text-bone-300 font-mono">Sprint 3 of 4</span>
              </div>
              <div className="card p-4.5 space-y-1.5">
                <span className="mono-tag text-[10px] text-bone-400 uppercase">Escrow Locked</span>
                <p className="text-base font-semibold text-bone-100">$12,500 / $18,000</p>
                <span className="text-[11px] text-emerald-400 font-mono">Funds safe in escrow</span>
              </div>
              <div className="card p-4.5 space-y-1.5">
                <span className="mono-tag text-[10px] text-bone-400 uppercase">Next Sync Call</span>
                <p className="text-base font-semibold text-bone-100">Thursday @ 3:00 PM</p>
                <span className="text-[11px] text-lime-400 font-mono">Google Meet scheduled</span>
              </div>
            </div>

            {/* Live Progress Tracker */}
            <div className="card p-5 sm:p-6 space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-700 pb-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-bone-100">Project Delivery Roadmap</h3>
                  <p className="text-xs text-bone-400">
                    Each milestone is tied to concrete deliverables. You review and sign off before next stage funds release.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("milestones")}
                  className="mono-tag text-xs text-lime-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  Inspect details <ChevronRight size={13} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-bone-300">Overall Completion</span>
                  <span className="font-bold text-lime-400">65% Delivered</span>
                </div>
                <div className="h-2 w-full rounded-full bg-ink-700 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-lime-500 to-emerald-400 rounded-full w-[65%]" />
                </div>
              </div>

              {/* Milestones Stream in Overview */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
                {[
                  {
                    id: "m1",
                    title: "M1: Architecture & UI",
                    due: "Completed Sep 05",
                    status: "approved",
                    desc: "Figma design system, database schemas, and Next.js 15 scaffold.",
                  },
                  {
                    id: "m2",
                    title: "M2: Audio DSP & Core",
                    due: "Due Sep 22",
                    status: approvedMilestones.includes("m2") ? "approved" : "in_progress",
                    desc: "Audio waveform renderer, user library, and batch processing engine.",
                  },
                  {
                    id: "m3",
                    title: "M3: Billing & Teams",
                    due: "Due Oct 02",
                    status: "next",
                    desc: "Stripe subscription webhooks, team seat allocation, and API keys.",
                  },
                  {
                    id: "m4",
                    title: "M4: QA & Launch",
                    due: "Due Oct 14",
                    status: "next",
                    desc: "Load testing, end-to-end security audits, and production CDN deployment.",
                  },
                ].map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-ink-700/80 bg-ink-900/60 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider",
                          m.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : m.status === "in_progress"
                              ? "bg-lime-400/15 text-lime-300 border border-lime-400/30"
                              : "bg-ink-700 text-bone-400"
                        )}
                      >
                        {m.status === "approved"
                          ? "Approved ✓"
                          : m.status === "in_progress"
                            ? "In Progress"
                            : "Upcoming"}
                      </span>
                      <span className="text-[10px] font-mono text-bone-400">{m.due}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-bone-100">{m.title}</h4>
                    <p className="text-[11px] text-bone-400 leading-relaxed">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Milestones & Approvals ──────────────────────── */}
        {activeTab === "milestones" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 text-xs text-bone-300 leading-relaxed">
              💡 <strong>How milestone approval works:</strong> When our team completes a stage sprint, you receive a staging preview link and deliverable bundle. You click <strong>“Approve Milestone”</strong> to authorize releasing that milestone&apos;s escrow payment.
            </div>

            <div className="space-y-3">
              {[
                {
                  id: "m1",
                  number: "01",
                  title: "Milestone 1 — System Architecture, UI System & Auth Scaffold",
                  amount: "$4,500",
                  deliverables: [
                    "Complete Figma UI kit with 40+ components",
                    "Supabase PostgreSQL schema with RLS policies",
                    "Next.js 15 repository scaffold with Google/GitHub OAuth",
                  ],
                },
                {
                  id: "m2",
                  number: "02",
                  title: "Milestone 2 — Web Audio Processing Engine & Realtime Waveforms",
                  amount: "$5,500",
                  deliverables: [
                    "WebAssembly audio processing pipeline",
                    "Interactive canvas waveform visualizer (<16ms frame rate)",
                    "Cloudflare R2 bucket integration for lossless audio storage",
                  ],
                },
                {
                  id: "m3",
                  number: "03",
                  title: "Milestone 3 — Subscriptions, Multi-Seat Teams & API Tokens",
                  amount: "$4,000",
                  deliverables: [
                    "Stripe customer portal & recurring tier checkout",
                    "Team invitation flow with RBAC role guards",
                    "Bearer token generator with rate limiting",
                  ],
                },
              ].map((m) => {
                const isApproved = approvedMilestones.includes(m.id);

                return (
                  <div
                    key={m.id}
                    className="card p-5 sm:p-6 space-y-4 border-ink-600/80 bg-ink-850/80"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-ink-700/80 pb-4">
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="font-mono text-lg font-bold text-bone-400">
                          {m.number}
                        </span>
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-bone-100">
                            {m.title}
                          </h3>
                          <span className="text-xs font-mono text-lime-400">
                            Milestone value: {m.amount}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold text-emerald-300">
                            <Check size={12} strokeWidth={3} />
                            Approved & Released
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleApprove(m.id)}
                            className="btn btn-primary h-9 px-4 text-xs font-semibold cursor-pointer"
                          >
                            Approve Milestone & Sign Off →
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="mono-tag text-[10px] text-bone-400 uppercase">
                        Sprint Deliverables Included:
                      </span>
                      <ul className="space-y-1.5">
                        {m.deliverables.map((d, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-xs text-bone-200 font-mono"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab 3: Deliverables & Assets ────────────────────────── */}
        {activeTab === "files" && (
          <div className="card p-5 sm:p-6 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-700 pb-4">
              <div>
                <h3 className="text-base font-semibold text-bone-100">Project Deliverables & Assets</h3>
                <p className="text-xs text-bone-400">
                  Every asset, Figma export, and source bundle is organized with revision history.
                </p>
              </div>
              <span className="mono-tag text-xs text-lime-400 self-start sm:self-auto">3 files ready</span>
            </div>

            <div className="divide-y divide-ink-700/80 rounded-xl border border-ink-700 overflow-hidden">
              {[
                {
                  name: "muse-design-system-v2.fig",
                  type: "Figma Archive",
                  size: "24.5 MB",
                  updated: "Yesterday by Lead Designer",
                },
                {
                  name: "audio-dsp-core-preview.zip",
                  type: "Compiled WebAssembly Build",
                  size: "4.2 MB",
                  updated: "3 days ago by Systems Engineer",
                },
                {
                  name: "database-schema-diagram.pdf",
                  type: "Architecture Specification",
                  size: "1.1 MB",
                  updated: "Sep 12 by Architect",
                },
              ].map((f, i) => {
                const isDownloading = downloadingFile === f.name;

                return (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-ink-850 hover:bg-ink-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-bone-300">
                        <FileUp size={16} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-bone-100 font-mono truncate">
                          {f.name}
                        </h4>
                        <p className="text-[11px] text-bone-400 font-mono">
                          {f.type} · {f.size} · {f.updated}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleDownloadFile(f.name)}
                        className="btn h-8 px-3.5 text-xs gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 size={12} className="animate-spin text-lime-400" />
                            <span>Verifying…</span>
                          </>
                        ) : (
                          <>
                            <Download size={12} />
                            <span>Download Package</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab 4: Support & Requests ───────────────────────────── */}
        {activeTab === "tickets" && (
          <div className="card p-5 sm:p-6 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-700 pb-4">
              <div>
                <h3 className="text-base font-semibold text-bone-100">Direct Support & Ticket Desk</h3>
                <p className="text-xs text-bone-400">
                  Zero email confusion. Every inquiry, scope change, or tweak is tracked with a dedicated engineer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                className="btn btn-primary h-8 px-3.5 text-xs cursor-pointer gap-1.5 self-start sm:self-auto"
              >
                <Plus size={13} />
                <span>New Request</span>
              </button>
            </div>

            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-ink-700 bg-ink-900/60 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="mono-tag text-[10px] font-bold text-bone-400 shrink-0">
                        {t.id}
                      </span>
                      <h4 className="text-xs font-semibold text-bone-100 truncate">
                        {t.subject}
                      </h4>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold self-start sm:self-auto",
                        t.statusTone === "resolved"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-lime-400/15 border-lime-400/30 text-lime-300"
                      )}
                    >
                      {t.status}
                    </span>
                  </div>

                  <p className="text-xs text-bone-300 leading-relaxed font-mono bg-ink-800/80 p-3 rounded-lg border border-ink-700/60">
                    “{t.reply}”
                    <span className="block mt-1 text-[10px] text-lime-400">— {t.by}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab 5: Invoicing & Escrow ───────────────────────────── */}
        {activeTab === "invoices" && (
          <div className="card p-5 sm:p-6 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-700 pb-4">
              <div>
                <h3 className="text-base font-semibold text-bone-100">Invoices & Escrow Transparency</h3>
                <p className="text-xs text-bone-400">
                  Every stage payment has a downloadable VAT/tax invoice and bank transfer receipt.
                </p>
              </div>
              <span className="text-xs font-mono text-bone-300 self-start sm:self-auto">Total Project: $18,000</span>
            </div>

            <div className="divide-y divide-ink-700/80 rounded-xl border border-ink-700 overflow-hidden">
              {[
                {
                  id: "INV-2026-081",
                  desc: "Milestone 1 Deposit (Architecture & Figma)",
                  amount: "$4,500.00",
                  date: "Sep 01, 2026",
                  status: "Paid & Cleared",
                },
                {
                  id: "INV-2026-082",
                  desc: "Milestone 2 Escrow Funding (Audio Engine)",
                  amount: "$5,500.00",
                  date: "Sep 15, 2026",
                  status: "Held in Escrow",
                },
              ].map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-ink-850"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-bone-100">{inv.id}</span>
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[9px] font-mono font-bold text-emerald-300">
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-bone-400">{inv.desc}</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div>
                      <span className="font-mono text-xs font-bold text-bone-100 block">{inv.amount}</span>
                      <span className="block text-[10px] text-bone-500 font-mono">{inv.date}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast.success(`Receipt for ${inv.id} downloaded.`)}
                      className="btn h-7 px-2.5 text-[11px] gap-1 cursor-pointer"
                    >
                      <FileText size={11} /> Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom Call To Action ──────────────────────────────── */}
        <div className="rounded-2xl border border-lime-400/40 bg-ink-850 p-6 sm:p-8 text-center space-y-4">
          <h3 className="text-xl sm:text-2xl font-display font-medium text-bone-50">
            Ready to experience this level of engineering clarity?
          </h3>
          <p className="text-xs sm:text-sm text-bone-300 max-w-xl mx-auto leading-relaxed">
            Every Nex Desk client gets their own dedicated portal on day one. Track every commit, approve deliverables with one click, and never wonder where your project stands.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact" className="btn btn-primary h-10 px-5 text-xs font-semibold">
              Start Your Project With Us →
            </Link>
            <Link href="/book" className="btn h-10 px-5 text-xs">
              Book a 20-Min Discovery Call
            </Link>
          </div>
        </div>
      </div>

      {/* ── Interactive Modal: New Support Request ─────────────── */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-ink-600 bg-ink-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-ink-700/80 pb-3">
              <div>
                <span className="mono-tag text-[10px] uppercase text-lime-400 font-bold">
                  Client Portal Simulation
                </span>
                <h3 className="text-base font-semibold text-bone-50">File a Support Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="rounded-lg p-1.5 text-bone-400 hover:bg-ink-800 hover:text-bone-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1.5">
                <label className="mono-tag text-xs text-bone-300 block">Subject / Feature *</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Add dark mode preference sync or sound waveform"
                  className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="mono-tag text-xs text-bone-300 block">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "normal", label: "Normal (Standard)" },
                    { id: "high", label: "High (Sprint Priority)" },
                    { id: "urgent", label: "Urgent (Blocking)" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id)}
                      className={cn(
                        "rounded-lg border py-1.5 px-2 text-[11px] font-mono transition-all",
                        newPriority === p.id
                          ? "border-lime-400 bg-lime-400/15 text-lime-300 font-bold"
                          : "border-ink-700 bg-ink-850 text-bone-400 hover:border-ink-600"
                      )}
                    >
                      {p.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="mono-tag text-xs text-bone-300 block">Details (Optional)</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe your desired tweak, test credentials, or acceptance criteria…"
                  className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-700/80">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="btn h-9 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="btn btn-primary h-9 px-4 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submittingTicket ? "Routing to Team…" : "Dispatch Ticket →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
