"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Copy, Check, FileDown, Loader2, UserPlus, Trash2, CheckCircle2, Eye, ExternalLink, Pencil } from "lucide-react";
import Modal from "@/components/admin/Modal";
import { createIntakeRequest, approveIntake, revokeIntake, resolveIntake, updateIntakeRequest, deleteIntakeRequest } from "@/lib/actions/intake";
import { intakeFieldsFor, intakeMessage } from "@/config/intakeFields";
import { fmtDate, fmtDateTime } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none";

/**
 * Asking somebody for their details after a call.
 *
 * Produces all three at once — the WhatsApp text, a PDF to attach, and the
 * link — because which one gets used depends entirely on the client, and
 * making that choice up front just adds a step.
 */
export default function RequestDetailsClient({ kind }: { kind: "client" | "staff" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [note, setNote] = useState("");
  const [made, setMade] = useState<{
    token: string;
    url: string;
    expiresAt: string;
    agency: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);

  const create = () =>
    start(async () => {
      const res = await createIntakeRequest({
        kind,
        label,
        note,
        recipientName,
        recipientEmail,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setMade({
        token: res.token,
        url: res.url,
        expiresAt: res.expiresAt,
        agency: res.agency,
      });
      router.refresh();
    });

  // Signed with the name from Settings, so the message and the PDF attached to
  // it cannot introduce the agency by two different names.
  const message = made ? intakeMessage(kind, made.url, made.agency) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // Say so rather than silently doing nothing.
      toast.error("Could not copy — select the text and copy it manually.");
    }
  };

  const pdf = async () => {
    setBusyPdf(true);
    try {
      const res = await fetch("/api/intake-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, token: made?.token, recipient: label.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Failed");

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `Nex-Desk-${kind === "client" ? "Client" : "Team"}-Details-Request.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e: any) {
      toast.error(e?.message || "Could not build the PDF.");
    } finally {
      setBusyPdf(false);
    }
  };

  const close = () => {
    setOpen(false);
    setMade(null);
    setLabel("");
    setNote("");
  };

  return (
    <>
      <button className="btn gap-2" onClick={() => setOpen(true)}>
        <Send size={14} /> Request {kind === "client" ? "Client" : "Staff"} Details
      </button>

      <Modal
        open={open}
        onClose={close}
        pending={pending}
        size="lg"
        title={made ? "Send this" : `Request ${kind === "client" ? "client" : "team member"} details`}
        description={
          made
            ? undefined
            : "Creates a private link you can send. Whatever they fill in waits for your approval — nothing is added to the system on its own."
        }
        footer={
          made ? (
            <button className="btn btn-primary" onClick={close}>
              Done
            </button>
          ) : (
            <>
              <button className="btn" onClick={close} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={create} disabled={pending}>
                {pending ? "Creating…" : "Create link"}
              </button>
            </>
          )
        }
      >
        {!made ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="mono-tag block text-[11px] text-bone-200">Recipient Name</label>
                  <span className="mono-tag text-[9px] text-lime-400 font-semibold">Required</span>
                </div>
                <input
                  className={`${field} placeholder:text-bone-500 text-bone-50`}
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Ahmed Sadiq"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="mono-tag block text-[11px] text-bone-200">Recipient Email</label>
                  <span className="mono-tag text-[9px] text-bone-500">Optional</span>
                </div>
                <input
                  type="email"
                  className={`${field} placeholder:text-bone-500 text-bone-50`}
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="ahmed@example.com"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="mono-tag block text-[11px] text-bone-200">Internal Reference</label>
                <span className="mono-tag text-[9px] text-bone-500">For dashboard</span>
              </div>
              <input
                className={`${field} placeholder:text-bone-500 text-bone-50`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={kind === "client" ? "e.g. Zenith E-commerce Onboarding" : "e.g. Frontend Developer Onboarding"}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="mono-tag block text-[11px] text-bone-200">Custom Note / Greeting</label>
                <span className="mono-tag text-[9px] text-bone-500">Optional</span>
              </div>
              <textarea
                className={`${field} min-h-[70px] resize-y placeholder:text-bone-500 text-bone-50`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Replaces the default welcome intro on the form."
              />
            </div>

            <div className="rounded-lg border border-ink-600 bg-ink-800/50 p-3.5">
              <p className="mono-tag mb-2 text-[10px]">They will be asked for</p>
              <ul className="space-y-1 text-xs text-bone-300">
                {intakeFieldsFor(kind).map((f) => (
                  <li key={f.key}>
                    • {f.label}
                    {f.required && <span className="text-lime-400"> *</span>}
                  </li>
                ))}
              </ul>
              {kind === "staff" && (
                <p className="mt-2.5 text-[11px] leading-relaxed text-bone-400">
                  Salary, seniority and department are not asked — those are yours to set on
                  their profile.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="mono-tag">Message for WhatsApp</span>
                <button
                  type="button"
                  onClick={copy}
                  className="mono-tag inline-flex items-center gap-1 text-[11px] text-lime-400 hover:underline"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              {/* Selectable and scrollable — some in-app browsers block the
                  clipboard, and then selecting the text is the only route. */}
              <textarea
                readOnly
                value={message}
                rows={10}
                onFocus={(e) => e.currentTarget.select()}
                className={`${field} resize-y font-mono text-xs leading-relaxed`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="btn btn-sm gap-1.5" onClick={pdf} disabled={busyPdf}>
                {busyPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Download PDF
              </button>
              <a
                href={made.url}
                target="_blank"
                rel="noreferrer"
                className="mono-tag text-[11px] text-bone-400 hover:text-lime-400"
              >
                open the form
              </a>
              <span className="mono-tag ml-auto text-[10px] text-bone-500">
                expires {fmtDate(made.expiresAt)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ---------------- Approval ---------------- */

export function IntakeRow({ row, isPrivileged = true }: { row: any; isPrivileged?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const p = (row.payload ?? {}) as Record<string, string>;
  const who = p.name || p.full_name || row.recipient_name || row.label || "Someone";
  const fields = intakeFieldsFor(row.kind);
  const isResolvedOrApproved = row.status === "approved" || row.status === "resolved";

  const [editRecipientName, setEditRecipientName] = useState(row.recipient_name || "");
  const [editRecipientEmail, setEditRecipientEmail] = useState(row.recipient_email || "");
  const [editLabel, setEditLabel] = useState(row.label || "");
  const [editNote, setEditNote] = useState(row.note || "");
  const [editKind, setEditKind] = useState<"client" | "staff">(row.kind || "client");

  const approve = () =>
    start(async () => {
      const res = await approveIntake(row.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Added. Finish setting them up on their profile.`);
      setOpen(false);
      router.refresh();
    });

  const resolve = () =>
    start(async () => {
      const res = await resolveIntake(row.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Request marked as resolved.");
      setOpen(false);
      router.refresh();
    });

  const handleUpdate = () =>
    start(async () => {
      const res = await updateIntakeRequest(row.id, {
        recipientName: editRecipientName,
        recipientEmail: editRecipientEmail,
        label: editLabel,
        note: editNote,
        kind: editKind,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Form request updated successfully.");
      setOpenEdit(false);
      router.refresh();
    });

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete this request for ${who}? The sent link will be permanently revoked.`)) return;
    start(async () => {
      const res = await deleteIntakeRequest(row.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Request deleted and link revoked.");
      router.refresh();
    });
  };

  return (
    <>
      <li className="flex flex-wrap items-start justify-between gap-3 p-4 hover:bg-ink-800/20 transition-colors">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-bone-100">{who}</p>
            <span
              className={`mono-tag text-[10px] px-2 py-0.5 rounded ${
                row.kind === "client" ? "bg-blue-400/10 text-blue-300 border border-blue-400/30" : "bg-lime-400/10 text-lime-300 border border-lime-400/30"
              }`}
            >
              {row.kind === "client" ? "Client Onboarding" : "Staff Onboarding"}
            </span>
            {row.recipient_name && row.recipient_name !== who && (
              <span className="mono-tag text-[10px] text-bone-400">
                To: {row.recipient_name}
              </span>
            )}
          </div>

          <p className="mono-tag text-[10px]">
            {row.status === "submitted"
              ? `sent ${fmtDateTime(row.submitted_at)}`
              : isResolvedOrApproved
                ? `resolved ${fmtDate(row.resolved_at || row.approved_at)}`
                : row.status === "revoked"
                  ? "link revoked"
                  : `waiting · expires ${fmtDate(row.expires_at)}`}
          </p>

          {(row.recipient_email || p.email) && (
            <p className="text-xs text-bone-400">
              Email: {p.email || row.recipient_email}
            </p>
          )}

          {row.label && row.label !== who && row.label !== row.recipient_name && (
            <p className="mt-0.5 text-xs text-bone-400">Note: {row.label}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {row.token && row.status === "pending" && (
            <a
              href={`/intake/${row.token}`}
              target="_blank"
              rel="noreferrer"
              className="mono-tag inline-flex items-center gap-1 rounded border border-ink-600 px-2 py-1 text-[11px] text-lime-400 hover:border-lime-400/40"
            >
              <ExternalLink size={11} /> Open Form
            </a>
          )}

          {/* Submitted or Resolved: button to view details */}
          {(row.status === "submitted" || isResolvedOrApproved) && (
            <button className="btn btn-sm gap-1.5" onClick={() => setOpen(true)}>
              <Eye size={13} /> {isResolvedOrApproved ? "View details" : "View details"}
            </button>
          )}

          {row.status === "submitted" && isPrivileged && (
            <button
              type="button"
              disabled={pending}
              onClick={resolve}
              className="btn btn-sm border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
              title="Mark as resolved / cleared without creating a new record"
            >
              <CheckCircle2 size={13} /> Mark resolved
            </button>
          )}

          {row.status === "pending" && isPrivileged && (
            <button
              type="button"
              disabled={pending}
              onClick={resolve}
              className="mono-tag inline-flex items-center gap-1 rounded border border-ink-600 px-2 py-1 text-[11px] text-bone-300 hover:border-emerald-400/40 hover:text-emerald-300"
              title="Mark as resolved / cleared"
            >
              <CheckCircle2 size={11} /> Resolve
            </button>
          )}

          {/* Admin Edit & Delete Actions */}
          {isPrivileged && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpenEdit(true)}
                className="rounded p-1.5 text-bone-400 hover:bg-ink-800 hover:text-lime-400"
                title="Edit request details form"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                disabled={pending}
                title="Delete this request (revokes link)"
                onClick={handleDelete}
                className="rounded p-1.5 text-bone-500 hover:bg-ink-800 hover:text-rose-400"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </li>

      {/* View Submitted Details Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        title={isResolvedOrApproved ? `Submitted Details — ${who}` : `Add ${who}?`}
        description={
          isResolvedOrApproved
            ? "Here are the details submitted by the recipient."
            : "This is what they sent. Adding them runs the normal create flow — including the welcome email and login."
        }
        footer={
          isResolvedOrApproved ? (
            <button className="btn btn-primary" onClick={() => setOpen(false)}>
              Close
            </button>
          ) : (
            <>
              <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
                Not yet
              </button>
              <button className="btn btn-primary" onClick={approve} disabled={pending}>
                {pending ? "Adding…" : `Add ${row.kind === "client" ? "client" : "employee"}`}
              </button>
            </>
          )
        }
      >
        <dl className="space-y-3">
          {fields.map((f) => (
            <div key={f.key} className="grid gap-0.5 sm:grid-cols-[160px_1fr] sm:gap-3">
              <dt className="mono-tag text-[10px]">{f.label}</dt>
              <dd className="whitespace-pre-line break-words text-sm text-bone-200">
                {p[f.key] || <span className="text-bone-600">—</span>}
              </dd>
            </div>
          ))}
        </dl>

        {row.kind === "staff" && !isResolvedOrApproved && (
          <p className="mt-4 rounded-lg border border-ink-600 bg-ink-800/60 p-3 text-[11px] leading-relaxed text-bone-400">
            Job title, salary and department are not in this form. They are created with
            placeholders — set them on the profile before the first payroll run.
          </p>
        )}
      </Modal>

      {/* Admin Edit Form Request Modal */}
      <Modal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        pending={pending}
        size="lg"
        title={`Edit Form Request — ${who}`}
        description="Modify recipient name, email, target role or internal note for this onboarding request."
        footer={
          <>
            <button className="btn" onClick={() => setOpenEdit(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleUpdate} disabled={pending}>
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block">Form Type (Client or Staff)</label>
            <select
              className={field}
              value={editKind}
              onChange={(e) => setEditKind(e.target.value as "client" | "staff")}
            >
              <option value="client">Client Onboarding</option>
              <option value="staff">Staff / Team Onboarding</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="mono-tag block text-[11px] text-bone-200">Recipient Name</label>
                <span className="mono-tag text-[9px] text-lime-400 font-semibold">Required</span>
              </div>
              <input
                className={`${field} placeholder:text-bone-500 text-bone-50`}
                value={editRecipientName}
                onChange={(e) => setEditRecipientName(e.target.value)}
                placeholder="Recipient full name"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="mono-tag block text-[11px] text-bone-200">Recipient Email</label>
                <span className="mono-tag text-[9px] text-bone-500">Optional</span>
              </div>
              <input
                type="email"
                className={`${field} placeholder:text-bone-500 text-bone-50`}
                value={editRecipientEmail}
                onChange={(e) => setEditRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="mono-tag block text-[11px] text-bone-200">Internal Reference / Label</label>
              <span className="mono-tag text-[9px] text-bone-500">For dashboard</span>
            </div>
            <input
              className={`${field} placeholder:text-bone-500 text-bone-50`}
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Internal label"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="mono-tag block text-[11px] text-bone-200">Instructions / Note for Recipient</label>
              <span className="mono-tag text-[9px] text-bone-500">Optional</span>
            </div>
            <textarea
              className={`${field} min-h-[70px] resize-y placeholder:text-bone-500 text-bone-50`}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Instructions note shown on public form"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
