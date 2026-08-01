"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Repeat, FileText } from "lucide-react";
import {
  raiseChangeRequest, quoteChangeRequest, approveChangeRequest,
  completeChangeRequest, declineChangeRequest,
} from "@/lib/actions/delivery";
import { money, CURRENCIES } from "@/lib/utils";
import Modal from "@/components/admin/Modal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";
import DocButton from "@/components/admin/DocButton";
import { Badge } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

/**
 * What a client asked for after the work was signed off.
 *
 * The point of the flow is that nothing gets built before it is priced and
 * agreed: requested → quoted → approved (invoice raised, project reopened) →
 * paid → completed. Handover stays locked from approval until the invoice
 * clears, so extra work can never be given away by accident.
 */
export default function ChangeRequestsCard({
  projectId,
  defaultCurrency,
  requests,
}: {
  projectId: string;
  defaultCurrency: string;
  requests: any[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [raising, setRaising] = useState(false);
  const [newReq, setNewReq] = useState({ title: "", description: "" });

  const [quoting, setQuoting] = useState<any | null>(null);
  const [quote, setQuote] = useState({ amount: "", currency: defaultCurrency, extraDays: "" });

  const [approving, setApproving] = useState<any | null>(null);
  const [declining, setDeclining] = useState<any | null>(null);

  const run = (fn: () => Promise<any>, onOk: (r: any) => void) =>
    start(async () => {
      try {
        const res = await fn();
        onOk(res);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "That didn't work.");
      }
    });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base">
          <Repeat size={15} className="text-lime-400" /> Change requests
        </h2>
        <button className="btn h-8 px-3 text-xs" onClick={() => setRaising(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Log one
        </button>
      </div>

      <div className="card divide-y divide-ink-600">
        {requests.length === 0 && (
          <p className="p-6 text-center text-sm leading-relaxed text-bone-300">
            Nothing requested. Anything the client asks for after sign-off goes here so it
            gets quoted and billed rather than absorbed.
          </p>
        )}

        {requests.map((r) => (
          <div key={r.id} className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-bone-50">{r.title}</p>
                <p className="mono-tag mt-1 text-[11px]">
                  {r.raised_by === "client" ? "Raised by the client" : "Logged internally"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              <Badge>{r.status}</Badge>
            </div>

            {r.description && (
              <p className="whitespace-pre-line text-xs leading-relaxed text-bone-300">
                {r.description}
              </p>
            )}

            {r.quoted_amount && (
              <p className="text-xs text-bone-200">
                Quoted{" "}
                <strong className="font-mono text-lime-400">
                  {money(Number(r.quoted_amount), r.currency)}
                </strong>
                {r.extra_days ? ` · adds ${r.extra_days} working days` : ""}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {r.status === "requested" && (
                <>
                  <button
                    className="btn btn-primary h-8 px-3 text-xs"
                    onClick={() => {
                      setQuote({ amount: "", currency: defaultCurrency, extraDays: "" });
                      setQuoting(r);
                    }}
                  >
                    Quote it
                  </button>
                  <button className="btn h-8 px-3 text-xs" onClick={() => setDeclining(r)}>
                    Decline
                  </button>
                </>
              )}

              {r.status === "quoted" && (
                <>
                  <DocButton type="change_order" id={r.id} label="Change order PDF" />
                  <button className="btn btn-primary h-8 px-3 text-xs" onClick={() => setApproving(r)}>
                    Client approved — invoice it
                  </button>
                  <button
                    className="btn h-8 px-3 text-xs"
                    onClick={() => {
                      setQuote({
                        amount: String(r.quoted_amount ?? ""),
                        currency: r.currency || defaultCurrency,
                        extraDays: String(r.extra_days ?? ""),
                      });
                      setQuoting(r);
                    }}
                  >
                    Re-quote
                  </button>
                </>
              )}

              {r.status === "invoiced" && (
                <>
                  <span className="mono-tag inline-flex h-8 items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3 text-[11px] text-amber-300">
                    Invoiced — handover locked until paid
                  </span>
                  <button
                    className="btn h-8 px-3 text-xs"
                    disabled={pending}
                    onClick={() =>
                      run(() => completeChangeRequest(r.id), () => toast.success("Change closed."))
                    }
                  >
                    Mark complete
                  </button>
                </>
              )}

              {r.status === "completed" && (
                <span className="mono-tag inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 text-[11px] text-emerald-300">
                  <FileText size={11} /> Done and paid
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Log a request */}
      <Modal
        open={raising}
        onClose={() => setRaising(false)}
        pending={pending}
        title="Log a change request"
        eyebrow="Change requests"
        description="What has the client asked for that sits outside the agreed scope?"
        footer={
          <>
            <button className="btn h-10" onClick={() => setRaising(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary h-10"
              disabled={pending}
              onClick={() =>
                run(
                  () => raiseChangeRequest({ projectId, ...newReq }),
                  () => {
                    toast.success("Logged. Quote it when you're ready.");
                    setRaising(false);
                    setNewReq({ title: "", description: "" });
                  }
                )
              }
            >
              {pending ? "Saving…" : "Log request"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block">What they asked for</label>
            <input
              className={field}
              value={newReq.title}
              placeholder="e.g. Add a blog section with categories"
              onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Detail</label>
            <textarea
              className={`${field} min-h-32 resize-y`}
              value={newReq.description}
              placeholder="Their words, as close to verbatim as you can — it goes on the change order they sign."
              onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Quote it */}
      <Modal
        open={!!quoting}
        onClose={() => setQuoting(null)}
        pending={pending}
        title="Price this change"
        eyebrow="Change requests"
        description={quoting?.title}
        footer={
          <>
            <button className="btn h-10" onClick={() => setQuoting(null)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary h-10"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    quoteChangeRequest(quoting.id, {
                      amount: Number(quote.amount),
                      currency: quote.currency,
                      extraDays: quote.extraDays ? Number(quote.extraDays) : undefined,
                    }),
                  (res) => {
                    toast.success(
                      res.emailed
                        ? "Change order sent to the client."
                        : "Quoted, but the email did not send."
                    );
                    setQuoting(null);
                  }
                )
              }
            >
              {pending ? "Sending…" : "Send change order"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block">Additional cost</label>
              <input
                className={field}
                type="number"
                min={0}
                value={quote.amount}
                onChange={(e) => setQuote({ ...quote, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block">Currency</label>
              <CustomSelect
                value={quote.currency}
                onChange={(v) => setQuote({ ...quote, currency: v })}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Extra working days</label>
            <input
              className={field}
              type="number"
              min={0}
              value={quote.extraDays}
              onChange={(e) => setQuote({ ...quote, extraDays: e.target.value })}
              placeholder="Moves the deadline honestly rather than silently"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-bone-300">
            This emails the client a change order PDF to approve. Nothing is built and nothing
            is billed until they say yes.
          </p>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!approving}
        onClose={() => setApproving(null)}
        onConfirm={() =>
          run(
            () => approveChangeRequest(approving.id),
            (res) => {
              toast.success(`Invoice ${res.invoiceNo} raised and sent.`);
              setApproving(null);
            }
          )
        }
        pending={pending}
        isDanger={false}
        title="Client approved this change?"
        confirmText={pending ? "Raising…" : "Raise the invoice"}
        description="This raises and emails an invoice for the quoted amount, and reopens the project as in-progress. Handover re-locks until that invoice is paid."
      />

      <ConfirmModal
        isOpen={!!declining}
        onClose={() => setDeclining(null)}
        onConfirm={() =>
          run(
            () => declineChangeRequest(declining.id),
            () => {
              toast.success("Declined. The record stays.");
              setDeclining(null);
            }
          )
        }
        pending={pending}
        title="Decline this request?"
        confirmText="Decline"
        description="The request stays on file marked declined, so there is a record of what was asked and when."
      />
    </section>
  );
}
