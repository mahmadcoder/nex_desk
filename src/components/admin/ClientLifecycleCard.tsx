"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCheck, Moon, Handshake, Users, Sparkles } from "lucide-react";
import { reactivateClient, setClientDormant, setClientReferrer } from "@/lib/actions/lifecycle";
import { adminPath } from "@/lib/utils";
import Modal from "@/components/admin/Modal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";
import { fmtDate } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

const LIFECYCLE_COPY: Record<string, { label: string; tone: string; blurb: string }> = {
  active: {
    label: "Active",
    tone: "border-emerald-400/40 bg-emerald-400/15 text-emerald-300",
    blurb: "Work in flight, or recently delivered.",
  },
  dormant: {
    label: "Dormant",
    tone: "border-amber-400/40 bg-amber-400/15 text-amber-300",
    blurb: "Everything finished. Still a client — just not right now.",
  },
  archived: {
    label: "Archived",
    tone: "border-ink-500 bg-ink-800 text-bone-300",
    blurb: "Deliberately put away and hidden from the main list.",
  },
};

/**
 * Where this client stands, and who introduced them.
 *
 * `is_active` existed since launch and nothing ever wrote to it, so a client
 * from two years ago looked identical to one shipping today, and there was no
 * route back when someone returned.
 */
export default function ClientLifecycleCard({
  client,
  referrer,
  referred,
  candidates,
}: {
  client: any;
  referrer: { id: string; name: string; company: string | null } | null;
  referred: Array<{ id: string; name: string; company: string | null }>;
  candidates: Array<{ id: string; name: string; company: string | null }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmReactivate, setConfirmReactivate] = useState(false);
  const [confirmDormant, setConfirmDormant] = useState(false);
  const [editingReferrer, setEditingReferrer] = useState(false);
  const [pick, setPick] = useState({ id: referrer?.id ?? "", note: client.referral_note ?? "", thank: true });

  const state = LIFECYCLE_COPY[client.lifecycle ?? "active"] ?? LIFECYCLE_COPY.active;

  /**
   * Actions RETURN their errors rather than throwing them: Next.js strips the
   * message from anything thrown inside a Server Action in production, so a
   * thrown refusal arrives as an anonymous 500 with nothing to show the user.
   */
  const run = (fn: () => Promise<any>, onOk: (r: any) => void) =>
    start(async () => {
      try {
        const res = await fn();
        if (res && res.ok === false) {
          toast.error(res.error || "That didn't work.");
          return;
        }
        onOk(res);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "That didn't work.");
      }
    });

  return (
    <section className="card my-6 space-y-4 border-ink-600 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <UserCheck size={16} className="text-lime-400" /> Relationship
        </h2>
        <span className={`mono-tag rounded-full border px-2.5 py-1 text-[11px] leading-none font-semibold ${state.tone}`}>
          {state.label}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-bone-300">
        {state.blurb}
        {Number(client.return_count) > 0 && (
          <>
            {" "}
            <strong className="text-bone-100">
              Come back {client.return_count} time{Number(client.return_count) === 1 ? "" : "s"}
            </strong>{" "}
            — a returning client is the cheapest work you will ever win.
          </>
        )}
      </p>

      {/* Referral in */}
      <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-3.5">
        <p className="mono-tag mb-1.5 flex items-center gap-1.5 text-[11px]">
          <Handshake size={12} className="text-lime-400" /> How they found us
        </p>
        {referrer ? (
          <p className="text-xs text-bone-200">
            Referred by{" "}
            <Link href={adminPath(`/clients/${referrer.id}`)} className="font-semibold text-lime-400 hover:underline">
              {referrer.company || referrer.name}
            </Link>
            {client.referral_note ? ` — ${client.referral_note}` : ""}
          </p>
        ) : (
          <p className="text-xs text-bone-300">
            {client.source
              ? `Came in through ${String(client.source).replace(/_/g, " ")}.`
              : "No referrer recorded."}
          </p>
        )}
        <button className="btn mt-2.5 h-8 px-3 text-xs" onClick={() => setEditingReferrer(true)}>
          {referrer ? "Change referrer" : "Record a referrer"}
        </button>
      </div>

      {/* Referrals out */}
      {!!referred.length && (
        <div className="rounded-lg border border-lime-400/25 bg-lime-400/[0.06] p-3.5">
          <p className="mono-tag mb-1.5 flex items-center gap-1.5 text-[11px] text-lime-300">
            <Users size={12} /> Referred {referred.length} client{referred.length === 1 ? "" : "s"}
          </p>
          <ul className="space-y-1">
            {referred.map((r) => (
              <li key={r.id}>
                <Link
                  href={adminPath(`/clients/${r.id}`)}
                  className="text-xs text-bone-200 hover:text-lime-400"
                >
                  {r.company || r.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-bone-300">
            Look after this one. People who refer once usually refer again.
          </p>
        </div>
      )}

      {/* They asked to come back. Shown directly above the Reactivate button so
          the request and the one action that answers it are never more than a
          few pixels apart — the notification that brought you here is easy to
          read and then forget to act on. */}
      {!!client.return_requested_at && client.lifecycle !== "active" && (
        <div className="rounded-lg border border-lime-400/35 bg-lime-400/[0.08] p-3.5">
          <p className="mono-tag mb-1.5 flex items-center gap-1.5 text-[11px] text-lime-300">
            <Sparkles size={12} /> They want to work with us again
          </p>
          <p className="text-xs leading-relaxed text-bone-200">
            Asked on{" "}
            {fmtDate(client.return_requested_at)}
            .
          </p>
          {client.return_request_note ? (
            <p className="mt-2 border-l-2 border-lime-400/40 pl-2.5 text-xs leading-relaxed whitespace-pre-wrap text-bone-100 italic">
              {client.return_request_note}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-bone-300">They did not leave a message.</p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-bone-300">
            Reactivating below reopens their portal and emails them. Their request clears at the
            same time.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
        {client.lifecycle === "active" ? (
          <button className="btn h-9 px-4 text-sm" disabled={pending} onClick={() => setConfirmDormant(true)}>
            <Moon className="mr-1.5 h-3.5 w-3.5" /> Mark dormant
          </button>
        ) : (
          <button
            className="btn btn-primary h-9 px-4 text-sm"
            disabled={pending}
            onClick={() => setConfirmReactivate(true)}
          >
            <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Reactivate client
          </button>
        )}
      </div>

      <Modal
        open={editingReferrer}
        onClose={() => setEditingReferrer(false)}
        pending={pending}
        title="Who introduced this client?"
        eyebrow="Referral"
        description="Recording it means the referrer gets thanked, and you can see who actually brings you work."
        footer={
          <>
            <button className="btn h-10" onClick={() => setEditingReferrer(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary h-10"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    setClientReferrer(client.id, pick.id || null, {
                      note: pick.note,
                      thank: pick.thank && !!pick.id && pick.id !== referrer?.id,
                    }),
                  (res) => {
                    toast.success(res.thanked ? "Saved, and the referrer has been thanked." : "Saved.");
                    setEditingReferrer(false);
                  }
                )
              }
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block">Referring client</label>
            <CustomSelect
              placeholder="Nobody / came in another way"
              value={pick.id}
              onChange={(v) => setPick({ ...pick, id: v })}
              options={[
                { value: "", label: "Nobody / came in another way" },
                ...candidates.map((c) => ({
                  value: c.id,
                  label: c.company ? `${c.name} — ${c.company}` : c.name,
                })),
              ]}
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Note</label>
            <input
              className={field}
              value={pick.note}
              placeholder="e.g. introduced over WhatsApp in July"
              onChange={(e) => setPick({ ...pick, note: e.target.value })}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 border-t border-ink-600 pt-4 text-xs text-bone-300">
            <input
              type="checkbox"
              checked={pick.thank}
              onChange={(e) => setPick({ ...pick, thank: e.target.checked })}
              className="mt-0.5 accent-[color:var(--color-lime-400)]"
            />
            Email the referrer a thank-you. Sent once, only when the referrer changes.
          </label>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmDormant}
        onClose={() => setConfirmDormant(false)}
        onConfirm={() =>
          run(
            () => setClientDormant(client.id),
            () => {
              toast.success("Marked dormant.");
              setConfirmDormant(false);
            }
          )
        }
        pending={pending}
        isDanger={false}
        title="Mark this client dormant?"
        confirmText="Mark dormant"
        description="They drop out of the main client list but nothing is deleted — every project, invoice and document stays. Refused if any project is still open. No email is sent."
      />

      <ConfirmModal
        isOpen={confirmReactivate}
        onClose={() => setConfirmReactivate(false)}
        onConfirm={() =>
          run(
            () => reactivateClient(client.id),
            (res) => {
              toast.success(res.emailed ? "Reactivated and welcomed back." : "Reactivated.");
              setConfirmReactivate(false);
            }
          )
        }
        pending={pending}
        isDanger={false}
        title="Bring this client back?"
        confirmText="Reactivate & welcome back"
        description="Returns them to the active list and emails a short welcome-back pointing at their portal, where everything from last time is still waiting."
      />
    </section>
  );
}
