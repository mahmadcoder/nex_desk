"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Mail, MessageCircle, Copy, Sparkles, Loader2 } from "lucide-react";
import { updateLead, deleteLead, convertLeadToClient, sendClientEmail } from "@/lib/actions";
import { adminPath, LEAD_STATUSES } from "@/lib/utils";
import { Badge } from "./ui";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
import AIAssist from "@/components/ui/AIAssist";
import { triageLead, setLeadPriority, type LeadPriority } from "@/lib/actions/leads";
import { fmtDate } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Loud enough to spot in a list, quiet enough not to shout on every row. */
const PRIORITY_STYLE: Record<string, string> = {
  urgent: "border-rose-400/50 bg-rose-400/15 text-rose-200",
  high: "border-amber-400/50 bg-amber-400/15 text-amber-200",
  normal: "border-lime-400/50 bg-lime-400/10 text-lime-300",
  low: "border-ink-400 bg-ink-700 text-bone-400",
};

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

export default function LeadRow({
  lead,
  convertedClientId = null,
}: {
  lead: any;
  convertedClientId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(lead.status);
  const [pending, start] = useTransition();

  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, startSending] = useTransition();
  const [mail, setMail] = useState({
    subject: `Re: your enquiry with Nex Desk`,
    body:
      `Hi ${String(lead.name ?? "there").split(" ")[0]},\n\n` +
      `Thanks for getting in touch about ${(lead.service_slugs ?? []).join(", ") || "your project"}.\n\n` +
      `\n\nBest regards,\nNex Desk`,
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  const [priority, setPriorityState] = useState<LeadPriority>(lead.priority ?? "normal");
  const [triaging, setTriaging] = useState(false);

  const initialTriage = lead.notes?.startsWith("AI triage: ")
    ? lead.notes.slice("AI triage: ".length)
    : "";
  const [initialSummary, initialNext] = initialTriage.includes(" • Next: ")
    ? initialTriage.split(" • Next: ")
    : [initialTriage, ""];

  const [triageSummary, setTriageSummary] = useState<string>(initialSummary);
  const [triageNextStep, setTriageNextStep] = useState<string>(initialNext);
  const [triageReply, setTriageReply] = useState("");

  const isSpam = status === "spam";

  const setPriority = (p: LeadPriority) => {
    setPriorityState(p);
    start(async () => {
      const res = await setLeadPriority(lead.id, p);
      if (!res.ok) toast.error(res.error);
    });
  };

  const triage = async () => {
    setTriaging(true);
    try {
      const res = await triageLead(lead.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPriorityState(res.priority);
      setTriageSummary(res.summary);
      setTriageNextStep(res.nextStep || "");
      setTriageReply(res.reply);
      toast.success(`Enquiry analyzed — priority set to ${res.priority}.`);
    } finally {
      setTriaging(false);
    }
  };

  const change = (s: string) => {
    setStatus(s);
    start(async () => {
      await updateLead(lead.id, { status: s });
      toast.success(s === "spam" ? "Marked as spam." : `Marked ${s}.`);
    });
  };

  const send = () => {
    if (!mail.subject.trim() || !mail.body.trim()) {
      return toast.error("A subject and a message are both required.");
    }
    startSending(async () => {
      try {
        // `sendClientEmail` already takes a free-form `to` and an optional
        // clientId, so replying to a lead needs no new action.
        const res = await sendClientEmail({
          templateKey: "lead_reply",
          to: lead.email,
          subject: mail.subject,
          body: mail.body,
        });
        if (!res.ok) {
          toast.error(res.error || "The email did not send.");
          return;
        }
        toast.success(`Sent to ${lead.email}.`);
        setComposeOpen(false);
        // Replying is the definition of "contacted" — one less click, and the
        // pipeline count stays honest.
        if (status === "new") change("contacted");
      } catch (e: any) {
        toast.error(e?.message || "The email did not send.");
      }
    });
  };

  const remove = () => {
    start(async () => {
      try {
        await deleteLead(lead.id);
        toast.success("Lead deleted.");
        setConfirmDelete(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "Could not delete that lead.");
      }
    });
  };

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-ink-700/30 ${isSpam ? "opacity-45" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            {/* Only the two that mean "look at this now". A dot on every row
                would carry no information at all. */}
            {(priority === "urgent" || priority === "high") && !isSpam && (
              <span
                title={`${priority} priority`}
                aria-label={`${priority} priority`}
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  priority === "urgent" ? "bg-rose-400" : "bg-amber-400"
                }`}
              />
            )}
            <p className={isSpam ? "line-through" : undefined}>{lead.name}</p>
          </div>
          <p className="text-xs text-bone-400">{lead.email}</p>
        </td>
        <td className="px-5 py-3 text-bone-400">{(lead.service_slugs ?? []).join(", ") || "—"}</td>
        <td className="px-5 py-3 text-bone-400">{lead.budget_range ?? "—"}</td>
        <td className="px-5 py-3 text-bone-400">{fmtDate(lead.created_at)}</td>
        <td className="px-5 py-3"><Badge>{status}</Badge></td>
        <td className="px-5 py-3 text-right text-bone-400">{open ? "−" : "+"}</td>
      </tr>

      {open && (
        <tr className="bg-ink-800/50 border-t border-ink-600/60">
          <td colSpan={6} className="p-0 whitespace-normal">
            <div className="p-5 sm:p-6 space-y-6">
              {/* Top section: Two Column Layout on lg+, single column on smaller screens */}
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                {/* Left Column: Client Message & Metadata */}
                <div className="space-y-5">
                  <div className="rounded-xl border border-ink-600 bg-ink-900/80 p-4">
                    <span className="mono-tag text-[10px] text-lime-400 font-semibold uppercase tracking-wider block mb-1.5">
                      Client Message
                    </span>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-bone-100">
                      {lead.message || "No message included."}
                    </p>
                  </div>

                  <div>
                    <span className="mono-tag text-[11px] text-bone-400 block mb-2 font-medium">
                      Enquiry & Attribution Details
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                      {[
                        ["Phone", lead.phone],
                        ["Company", lead.company],
                        ["City", lead.city],
                        ["Country", lead.country],
                        ["Timeline", lead.timeline],
                        ["Budget", lead.budget_range],
                        ["Source", lead.source],
                        ["Campaign", lead.utm_campaign],
                        ["UTM Source", lead.utm_source],
                        ["Referrer", lead.referrer],
                        ["Landing Page", lead.landing_page],
                      ].map(([k, v]) => (
                        <div
                          key={k as string}
                          className="rounded-lg border border-ink-700 bg-ink-900/50 p-2.5 min-w-0"
                        >
                          <span className="mono-tag text-[10px] text-bone-400 block truncate">
                            {k}
                          </span>
                          <p
                            className="mt-0.5 font-medium text-bone-100 truncate text-xs"
                            title={String(v || "—")}
                          >
                            {(v as string) || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status update pills */}
                  <div className="pt-1">
                    <span className="mono-tag text-[11px] text-bone-400 block mb-2">
                      Pipeline Stage
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {LEAD_STATUSES.map((s) => (
                        <button
                          key={s}
                          disabled={pending}
                          onClick={(e) => {
                            e.stopPropagation();
                            change(s);
                          }}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            status === s
                              ? s === "spam"
                                ? "border-rose-500 bg-rose-600 text-white"
                                : "border-lime-400 bg-lime-400 text-lime-950 font-semibold"
                              : "border-ink-600 bg-ink-800/60 text-bone-300 hover:border-ink-500 hover:text-bone-100"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Lead Intelligence & Triage */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-lime-400/30 bg-gradient-to-b from-lime-400/[0.04] to-ink-800/80 p-4 sm:p-5 space-y-4">
                    {/* Header: Title + Triage Button */}
                    <div className="flex items-center justify-between gap-3 border-b border-ink-700 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={15} className="text-lime-400 shrink-0" />
                        <span className="text-xs font-semibold text-bone-50 uppercase tracking-wider">
                          AI Lead Triage
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-primary gap-1.5 text-xs h-8 px-3"
                        disabled={triaging}
                        onClick={(e) => {
                          e.stopPropagation();
                          triage();
                        }}
                      >
                        {triaging ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        {triaging ? "Analyzing…" : triageSummary ? "Re-triage" : "Triage with AI"}
                      </button>
                    </div>

                    {/* Priority Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="mono-tag text-[10px] text-bone-400">Estimated Priority</span>
                        <span className="mono-tag text-[10px] text-bone-500">Click to override</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(["low", "normal", "high", "urgent"] as const).map((p) => (
                          <button
                            key={p}
                            disabled={pending}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPriority(p);
                            }}
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] uppercase font-mono tracking-wider transition-colors ${
                              priority === p
                                ? PRIORITY_STYLE[p]
                                : "border-ink-600 bg-ink-900/60 text-bone-400 hover:border-ink-500 hover:text-bone-200"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Assessment / Summary */}
                    {triageSummary ? (
                      <div className="space-y-3 rounded-lg border border-ink-700 bg-ink-900/70 p-3">
                        <div>
                          <span className="mono-tag text-[10px] text-lime-400 block mb-1">
                            Executive Assessment
                          </span>
                          <p className="text-xs leading-relaxed text-bone-100">
                            {triageSummary}
                          </p>
                        </div>

                        {triageNextStep && (
                          <div className="border-t border-ink-700/80 pt-2.5">
                            <span className="mono-tag text-[10px] text-amber-300 block mb-1">
                              Recommended Next Step
                            </span>
                            <p className="text-xs leading-relaxed text-bone-200">
                              {triageNextStep}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-ink-600 bg-ink-900/30 p-3 text-center">
                        <p className="text-xs text-bone-400">
                          Click <strong className="text-bone-200">Triage with AI</strong> to score priority, summarize requirements, and generate a client-ready reply.
                        </p>
                      </div>
                    )}

                    {/* Draft Reply Preview */}
                    {triageReply && (
                      <div className="space-y-2 rounded-lg border border-ink-700 bg-ink-900/90 p-3">
                        <div className="flex items-center justify-between">
                          <span className="mono-tag text-[10px] text-bone-300 font-medium">
                            Drafted Client Reply
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(triageReply);
                              toast.success("Draft reply copied to clipboard.");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-bone-400 hover:text-lime-400 transition-colors"
                          >
                            <Copy size={11} /> Copy
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto rounded bg-ink-950/80 p-2.5 text-xs leading-relaxed text-bone-200 whitespace-pre-wrap font-sans border border-ink-800">
                          {triageReply}
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary w-full justify-center gap-1.5 text-xs h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMail((m) => ({ ...m, body: `${triageReply}\n\nNex Desk` }));
                              setComposeOpen(true);
                            }}
                          >
                            <Mail size={12} /> Open & Send in Email Composer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar: Communication & Conversion */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700/80 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn h-9 text-xs gap-1.5 px-3.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setComposeOpen(true);
                    }}
                  >
                    <Mail size={13} /> Email Lead
                  </button>

                  {lead.phone && (
                    <a
                      href={`https://wa.me/${String(lead.phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="btn h-9 text-xs gap-1.5 px-3.5"
                    >
                      <MessageCircle size={13} className="text-lime-400" /> WhatsApp
                    </a>
                  )}

                  {convertedClientId ? (
                    <Link
                      href={adminPath(`/clients/${convertedClientId}`)}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-4 text-xs font-medium text-lime-300"
                    >
                      ✓ Converted to client
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary h-9 text-xs gap-1.5 px-4 font-semibold"
                      disabled={pending || isSpam}
                      title={isSpam ? "Take this out of spam first." : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        start(() => convertLeadToClient(lead.id) as never);
                      }}
                    >
                      {pending ? "Converting…" : "Convert to Client"}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-ink-600 px-3 text-xs text-bone-400 transition-colors hover:border-rose-500/50 hover:text-rose-400"
                  disabled={pending}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}

      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        pending={sending}
        title="Reply to this lead"
        eyebrow="Leads"
        description={`To ${lead.email}`}
        footer={
          <>
            <button
              className="btn h-10"
              onClick={() => {
                navigator.clipboard.writeText(lead.email);
                toast.success("Address copied.");
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy address
            </button>
            <button className="btn btn-primary h-10" onClick={send} disabled={sending}>
              {sending ? "Sending…" : "Send email"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block">Subject</label>
            <input
              className={field}
              value={mail.subject}
              onChange={(e) => setMail({ ...mail, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Message</label>
            <textarea
              className={`${field} min-h-56 resize-none`}
              value={mail.body}
              onChange={(e) => setMail({ ...mail, body: e.target.value })}
            />
            <AIAssist
              field="client_email"
              getText={() => mail.body}
              context={{
                recipient: lead.name ?? "",
                their_enquiry: (lead.message ?? "").slice(0, 400),
                services_asked_for: (lead.service_slugs ?? []).join(", "),
              }}
              onApply={(v) => setMail((m) => ({ ...m, body: v }))}
            />
            <p className="mt-1.5 text-[11px] text-bone-400">
              Sent on the Nex Desk letterhead. Blank lines separate paragraphs, a
              block of <span className="font-mono">•</span> lines becomes a callout,
              <span className="font-mono"> ## </span> makes a heading and
              <span className="font-mono"> **text** </span> is bold.
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        pending={pending}
        title="Delete this lead?"
        confirmText="Delete lead"
        description={`${lead.name} (${lead.email}) will be removed permanently. If it is a real enquiry that went nowhere, mark it "lost" instead — that keeps the record.`}
      />
    </>
  );
}
