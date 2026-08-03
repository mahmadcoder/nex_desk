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
  const [triageSummary, setTriageSummary] = useState<string>(
    // A saved triage survives a refresh, so the row is not blank next time.
    lead.notes?.startsWith("AI triage: ") ? lead.notes.slice("AI triage: ".length) : ""
  );
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
      setTriageReply(res.reply);
      toast.success(`Read it — looks ${res.priority}.`);
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
        <td className="px-5 py-3 text-bone-400">{new Date(lead.created_at).toLocaleDateString("en-GB")}</td>
        <td className="px-5 py-3"><Badge>{status}</Badge></td>
        <td className="px-5 py-3 text-right text-bone-400">{open ? "−" : "+"}</td>
      </tr>

      {open && (
        <tr className="bg-ink-800/40">
          <td colSpan={6} className="px-5 py-5">
            <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
              <div>
                <p className="mono-tag">Message</p>
                <p className="mt-2 whitespace-pre-line text-sm text-bone-200">
                  {lead.message || "No message included."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  {[
                    ["Phone", lead.phone],
                    ["Company", lead.company],
                    ["City", lead.city],
                    ["Country", lead.country],
                    ["Timeline", lead.timeline],
                    ["Source", lead.source],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <p className="mono-tag">{k}</p>
                      <p className="mt-0.5">{(v as string) || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {/* Triage. `leads.priority` and `leads.notes` have been in the
                    schema since launch with no UI, so every enquiry looked
                    exactly as important as every other one. */}
                <div className="rounded-lg border border-ink-600 bg-ink-800/60 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="mono-tag">Priority</p>
                    <button
                      className="btn btn-sm gap-1.5"
                      disabled={triaging}
                      onClick={(e) => { e.stopPropagation(); triage(); }}
                    >
                      {triaging ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {triaging ? "Reading…" : "Triage with AI"}
                    </button>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(["low", "normal", "high", "urgent"] as const).map((p) => (
                      <button
                        key={p}
                        disabled={pending}
                        onClick={(e) => { e.stopPropagation(); setPriority(p); }}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                          priority === p
                            ? PRIORITY_STYLE[p]
                            : "border-ink-500 text-bone-300 hover:border-ink-400"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {triageSummary && (
                    <p className="mt-2.5 border-t border-ink-700 pt-2.5 text-[11px] leading-relaxed text-bone-300">
                      {triageSummary}
                    </p>
                  )}

                  {triageReply && (
                    <button
                      className="btn btn-sm mt-2.5 w-full justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMail((m) => ({ ...m, body: `${triageReply}\n\nNex Desk` }));
                        setComposeOpen(true);
                      }}
                    >
                      Open the drafted reply
                    </button>
                  )}
                </div>

                <div>
                  <p className="mono-tag mb-2">Move to</p>
                  <div className="flex flex-wrap gap-1.5">
                    {LEAD_STATUSES.map((s) => (
                      <button
                        key={s}
                        disabled={pending}
                        onClick={(e) => { e.stopPropagation(); change(s); }}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          status === s
                            ? s === "spam"
                              ? "border-rose-500 bg-rose-600 text-white"
                              : "border-lime-400 bg-lime-400 text-lime-950"
                            : "border-ink-500 text-bone-300 hover:border-ink-600"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/*
                    An in-app compose window, not `mailto:`. The old link had no
                    stopPropagation, so the row's onClick collapsed the panel and
                    unmounted the anchor mid-navigation — and on a machine with no
                    default mail client `mailto:` does nothing regardless.
                  */}
                  <button
                    className="btn h-9 text-sm"
                    onClick={(e) => { e.stopPropagation(); setComposeOpen(true); }}
                  >
                    <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
                  </button>

                  {lead.phone && (
                    <a
                      href={`https://wa.me/${String(lead.phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="btn h-9 text-sm"
                    >
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}

                  {convertedClientId ? (
                    <Link
                      href={adminPath(`/clients/${convertedClientId}`)}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-4 text-xs text-lime-400"
                    >
                      ✓ Converted to client
                    </Link>
                  ) : (
                    <button
                      className="btn btn-primary h-9 text-sm"
                      disabled={pending || isSpam}
                      title={isSpam ? "Take this out of spam first." : undefined}
                      onClick={(e) => { e.stopPropagation(); start(() => convertLeadToClient(lead.id) as never); }}
                    >
                      {pending ? "Converting…" : "Convert to client"}
                    </button>
                  )}

                  <button
                    className="inline-flex h-9 items-center rounded-full border border-ink-500 px-3 text-xs text-bone-400 transition-colors hover:border-rose-500/50 hover:text-rose-400"
                    disabled={pending}
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </button>
                </div>
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
              className={`${field} min-h-56 resize-y`}
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
