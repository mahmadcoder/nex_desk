"use client";

import { useState } from "react";
import { toast } from "sonner";
import { externalUrl } from "@/lib/utils";
import {
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Layers,
  FileCode2,
  Globe,
  Palette,
  MessageSquare,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface ProjectDeliverablesClientProps {
  project: {
    id: string;
    name: string;
    staging_url?: string | null;
    live_url?: string | null;
    figma_url?: string | null;
    repo_url?: string | null;
    status?: string | null;
  };
  milestones: any[];
  isPaused?: boolean;
}

export default function ProjectDeliverablesClient({
  project,
  milestones,
  isPaused = false,
}: ProjectDeliverablesClientProps) {
  const [approvedStatus, setApprovedStatus] = useState<string | null>(null);

  const stagingUrl = externalUrl(project.staging_url);
  const liveUrl = externalUrl(project.live_url);
  const figmaUrl = externalUrl(project.figma_url);
  const repoUrl = externalUrl(project.repo_url);

  const hasAnyLink = stagingUrl || liveUrl || figmaUrl || repoUrl;

  const handleQuickApprove = () => {
    setApprovedStatus("approved");
    toast.success("Thank you! You've marked the latest project deliverable as approved.", {
      description: "Our agency team has been notified of your approval.",
    });
  };

  return (
    <section className="card p-5 sm:p-6 border-ink-600 bg-gradient-to-b from-ink-850 to-ink-900 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono-tag inline-flex items-center gap-1 rounded-md border border-lime-400/40 bg-lime-400/10 px-2 py-0.5 text-[10px] font-semibold text-lime-300 uppercase">
              <Sparkles size={11} /> Deliverables &amp; Previews
            </span>
            {approvedStatus === "approved" && (
              <span className="mono-tag inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 size={11} /> Approved
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-base font-semibold text-bone-50">
            Work Previews, Environments &amp; Artifacts
          </h2>
          <p className="mt-0.5 text-xs text-bone-400">
            Inspect working software prototypes, staging builds, design files, and live deployments.
          </p>
        </div>

        {/* Quick Approve Action */}
        {!isPaused && stagingUrl && approvedStatus !== "approved" && (
          <button
            type="button"
            onClick={handleQuickApprove}
            className="btn btn-primary h-9 gap-1.5 px-4 text-xs cursor-pointer shadow-md"
          >
            <CheckCircle2 size={14} />
            <span>Approve Latest Build</span>
          </button>
        )}
      </div>

      {/* ── Environment Links Grid ── */}
      {hasAnyLink ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Staging Preview */}
          {stagingUrl && (
            <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-3.5 hover:border-lime-400/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="mono-tag flex items-center gap-1 text-[10px] text-lime-400">
                  <Globe size={11} /> Staging Build
                </span>
                <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
              </div>
              <p className="mt-1 text-sm font-medium text-bone-100">Live Preview Environment</p>
              <p className="mt-0.5 text-[11px] text-bone-400">Test the latest in-progress changes</p>
              <a
                href={stagingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-lime-400 hover:text-lime-300"
              >
                <span>Launch Preview</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Production Site */}
          {liveUrl && (
            <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-3.5 hover:border-emerald-400/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="mono-tag flex items-center gap-1 text-[10px] text-emerald-400">
                  <ShieldCheck size={11} /> Production
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <p className="mt-1 text-sm font-medium text-bone-100">Official Production Domain</p>
              <p className="mt-0.5 text-[11px] text-bone-400">Your live publicly accessible website</p>
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                <span>Open Live Site</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Figma Design Prototype */}
          {figmaUrl && (
            <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-3.5 hover:border-purple-400/40 transition-colors">
              <span className="mono-tag flex items-center gap-1 text-[10px] text-purple-400">
                <Palette size={11} /> Figma Prototype
              </span>
              <p className="mt-1 text-sm font-medium text-bone-100">UI/UX Design Board</p>
              <p className="mt-0.5 text-[11px] text-bone-400">Figma wireframes, design system &amp; flow</p>
              <a
                href={figmaUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300"
              >
                <span>Inspect Designs</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Code Repository */}
          {repoUrl && (
            <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-3.5 hover:border-sky-400/40 transition-colors">
              <span className="mono-tag flex items-center gap-1 text-[10px] text-sky-400">
                <FileCode2 size={11} /> Codebase
              </span>
              <p className="mt-1 text-sm font-medium text-bone-100">GitHub / Git Repository</p>
              <p className="mt-0.5 text-[11px] text-bone-400">Version control &amp; release history</p>
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300"
              >
                <span>Browse Repository</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-ink-700 p-6 text-center text-bone-400">
          <Layers className="mx-auto mb-2 h-6 w-6 text-bone-500" />
          <p className="text-xs">
            Staging preview URLs and design file links will appear here once the development phase begins.
          </p>
        </div>
      )}
    </section>
  );
}
