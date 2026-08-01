"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, PackageCheck, Heart, Send } from "lucide-react";
import { handoverProject, sendProjectThankYou } from "@/lib/actions/delivery";
import ConfirmModal from "@/components/admin/ConfirmModal";
import DocButton from "@/components/admin/DocButton";

/**
 * Handover as an event.
 *
 * The old control was a `DocButton` that generated the PDF and opened it in a
 * new tab: nothing recorded, nobody told, and the button carried on inviting
 * you to do it again. This sends the pack, stamps the project, and then says
 * so — with the thank-you as a deliberately separate, later action.
 */
export default function HandoverPanel({
  project,
  ready,
  reasons,
}: {
  project: { id: string; name: string; handed_over_at: string | null; thanked_at: string | null };
  ready: boolean;
  reasons: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmHandover, setConfirmHandover] = useState(false);
  const [confirmThanks, setConfirmThanks] = useState(false);

  const handedOver = !!project.handed_over_at;

  const doHandover = () => {
    start(async () => {
      try {
        const res = await handoverProject(project.id);
        if (res.ok) {
          toast.success(
            res.staffTotal
              ? `Handed over. Client, you and ${res.staffEmailed} of ${res.staffTotal} assigned staff notified.`
              : "Handed over. The client has the pack."
          );
        } else {
          toast.warning(`Project marked handed over, but the client email failed: ${res.error}`);
        }
        setConfirmHandover(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "Could not hand this project over.");
      }
    });
  };

  const doThanks = () => {
    start(async () => {
      try {
        const res = await sendProjectThankYou(project.id);
        if (res.ok) toast.success("Thank-you sent.");
        else toast.error(res.error || "The thank-you did not send.");
        setConfirmThanks(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "The thank-you did not send.");
      }
    });
  };

  return (
    <section className="card space-y-4 border-ink-600 p-5">
      <div className="flex items-center justify-between gap-3 border-b border-ink-700 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <PackageCheck size={16} className="text-lime-400" /> Handover
        </h2>
        {handedOver && (
          <span className="mono-tag rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 text-[11px] leading-none font-semibold text-emerald-300">
            Handed over
          </span>
        )}
      </div>

      {handedOver ? (
        <>
          <p className="text-xs leading-relaxed text-bone-300">
            Delivered to the client on{" "}
            <strong className="text-bone-100">
              {new Date(project.handed_over_at!).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </strong>
            . They have the credentials, the handover pack and the warranty terms.
          </p>

          <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
            <DocButton type="handover" id={project.id} label="Re-download pack" />
            {project.thanked_at ? (
              <span className="mono-tag inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-600 px-3.5 text-[11px] text-bone-300">
                <Heart size={12} className="text-lime-400" /> Thanked{" "}
                {new Date(project.thanked_at).toLocaleDateString("en-GB")}
              </span>
            ) : (
              <button
                className="btn btn-primary h-9 px-4 text-sm"
                disabled={pending}
                onClick={() => setConfirmThanks(true)}
              >
                <Heart className="mr-1.5 h-3.5 w-3.5" /> Send thank-you
              </button>
            )}
          </div>

          {!project.thanked_at && (
            <p className="text-[11px] leading-relaxed text-bone-300">
              Best sent a few days after delivery, once they have lived with it. It also
              asks for a testimonial and an introduction.
            </p>
          )}
        </>
      ) : ready ? (
        <>
          <p className="text-xs leading-relaxed text-bone-300">
            Everything is paid. Handing over emails the client the pack with all credentials,
            copies you and every assigned staff member, and marks the project delivered.
          </p>
          <button
            className="btn btn-primary h-10 w-full justify-center text-sm"
            disabled={pending}
            onClick={() => setConfirmHandover(true)}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {pending ? "Sending…" : "Hand over & notify everyone"}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3">
            <Lock size={14} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="space-y-1 text-xs leading-relaxed text-amber-200">
              {reasons.map((r) => (
                <p key={r}>{r}</p>
              ))}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-bone-300">
            Handover transfers ownership and hands over every credential, so it stays locked
            until the money is in. The same check runs on the server — hiding the button is
            not the control.
          </p>
        </>
      )}

      <ConfirmModal
        isOpen={confirmHandover}
        onClose={() => setConfirmHandover(false)}
        onConfirm={doHandover}
        pending={pending}
        isDanger={false}
        title={`Hand over ${project.name}?`}
        confirmText={pending ? "Sending…" : "Hand over & notify"}
        description="This emails the client the full handover pack including credentials, copies you and every assigned staff member, and marks the project delivered. Only do this when the work is genuinely finished."
      />

      <ConfirmModal
        isOpen={confirmThanks}
        onClose={() => setConfirmThanks(false)}
        onConfirm={doThanks}
        pending={pending}
        isDanger={false}
        title="Send the thank-you?"
        confirmText={pending ? "Sending…" : "Send it"}
        description="A short personal note thanking them, asking for a few honest lines about how it went, and inviting an introduction. Sent once."
      />
    </section>
  );
}
