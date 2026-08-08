"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateProject, sendProgressUpdate } from "@/lib/actions";
import CustomSelect from "@/components/ui/CustomSelect";
import { externalUrl } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field = "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none";
const STATUSES = ["not_started", "in_progress", "review", "on_hold", "delivered", "completed", "cancelled"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

export default function ProjectControls({
  project, clientEmail,
}: { project: any; clientEmail: string }) {
  const [f, setF] = useState({
    status: project.status,
    staging_url: project.staging_url ?? "",
    live_url: project.live_url ?? "",
    deadline: project.deadline ?? "",
    priority: project.priority ?? "normal",
    estimated_delivery: project.estimated_delivery ?? "",
    // Edited as one comma-separated line and stored as text[]. A chip editor
    // would be nicer and is not worth a second state machine here.
    tech_stack: (project.tech_stack ?? []).join(", "),
    client_notes: project.client_notes ?? "",
    budget: project.budget ?? "",
  });
  const [pending, start] = useTransition();

  // Which button is working, so only that one shows a spinner rather than both
  // going disabled with no explanation.
  const [busy, setBusy] = useState<"save" | "email" | null>(null);

  const save = () => {
    setBusy("save");
    start(async () => {
      try {
        await updateProject(project.id, {
          ...f,
          // Normalised before saving: a bare "client.com" is a relative path to
          // the browser, so the portal link resolved to OUR domain instead of
          // the client's site.
          staging_url: externalUrl(f.staging_url),
          live_url: externalUrl(f.live_url),
          deadline: f.deadline || null,
          estimated_delivery: f.estimated_delivery || null,
          tech_stack: f.tech_stack
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean),
          client_notes: f.client_notes.trim() || null,
          budget: f.budget === "" ? null : Number(f.budget),
          delivered_at: f.status === "delivered" ? new Date().toISOString() : project.delivered_at,
        });
        // Reflect what was actually stored, so the field shows https:// too.
        setF((p) => ({
          ...p,
          staging_url: externalUrl(p.staging_url) ?? "",
          live_url: externalUrl(p.live_url) ?? "",
        }));
        toast.success("Project updated.");
      } catch (e: any) {
        toast.error(e?.message || "Could not save those changes.");
      } finally {
        setBusy(null);
      }
    });
  };

  // Content (recent shared work logs + milestone state) is assembled on the
  // server so the email matches what the client sees in their portal.
  const emailProgress = () => {
    setBusy("email");
    start(async () => {
    try {
      const res = await sendProgressUpdate(project.id);
      res.ok
        ? toast.success(`Progress update sent to ${clientEmail}.`)
        : toast.error(res.error ?? "Send failed.");
    } catch (e: any) {
      toast.error(e?.message ?? "Send failed.");
    } finally {
      setBusy(null);
    }
    });
  };

  return (
    <div className="card space-y-4 p-5">
      <div>
        <label className="mono-tag mb-1.5 block">Status</label>
        <CustomSelect
          value={f.status}
          onChange={(v) => setF({ ...f, status: v })}
          options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
        />
      </div>
      <div>
        <label className="mono-tag mb-1.5 block">Staging link</label>
        <input className={field} value={f.staging_url} onChange={(e) => setF({ ...f, staging_url: e.target.value })}
          placeholder="https://staging.client.com" />
      </div>
      <div>
        <label className="mono-tag mb-1.5 block">Live URL</label>
        <input className={field} value={f.live_url} onChange={(e) => setF({ ...f, live_url: e.target.value })} />
      </div>
      <div>
        <label className="mono-tag mb-1.5 block">Deadline</label>
        <input className={field} type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
        <p className="mt-1 text-[11px] text-bone-400">The agreed date. It is on the signed PDF — do not move it quietly.</p>
      </div>

      <div>
        <label className="mono-tag mb-1.5 block">Estimated delivery</label>
        <input
          className={field}
          type="date"
          value={f.estimated_delivery}
          onChange={(e) => setF({ ...f, estimated_delivery: e.target.value })}
        />
        {/* Two dates on purpose. The client's portal shows both and flags the
            gap — which is the number they actually want and never get. */}
        <p className="mt-1 text-[11px] text-bone-400">
          Where you honestly think it lands. Past the deadline shows the client a slip warning.
        </p>
      </div>

      <div>
        <label className="mono-tag mb-1.5 block">Delivery budget</label>
        <input
          className={field}
          type="number"
          min="0"
          step="1"
          value={f.budget}
          onChange={(e) => setF({ ...f, budget: e.target.value })}
          placeholder="What you are willing to spend delivering it"
        />
        {/* Not the client price — that lives on the signed agreement. This is
            what the work is allowed to cost us, and it is what the cost panel
            measures tracked hours and expenses against. */}
        <p className="mt-1 text-[11px] text-bone-400">
          Internal only. Never shown to the client, and never the same thing as the deal total.
        </p>
      </div>

      <div>
        <label className="mono-tag mb-1.5 block">Priority</label>
        <CustomSelect
          value={f.priority}
          onChange={(v) => setF({ ...f, priority: v })}
          options={PRIORITIES.map((p) => ({ value: p, label: p }))}
        />
      </div>

      <div>
        <label className="mono-tag mb-1.5 block">Technology stack</label>
        <input
          className={field}
          value={f.tech_stack}
          onChange={(e) => setF({ ...f, tech_stack: e.target.value })}
          placeholder="Next.js, Supabase, Stripe"
        />
        <p className="mt-1 text-[11px] text-bone-400">Comma separated. Shown as chips in the client portal.</p>
      </div>

      <div className="sm:col-span-2">
        <label className="mono-tag mb-1.5 block">Notes for the client</label>
        <textarea
          className={`${field} min-h-[90px] resize-y`}
          value={f.client_notes}
          onChange={(e) => setF({ ...f, client_notes: e.target.value })}
          placeholder="Anything they should know outside the day-to-day updates."
        />
        <p className="mt-1 text-[11px] text-bone-400">
          The client reads this word for word on their project&apos;s Notes tab.
        </p>
      </div>

      {/* Each button reports its own progress. Both simply greying out told you
          something was happening but not what, or whether it had finished. */}
      <div className="flex gap-2 border-t border-ink-600 pt-4">
        <button
          className="btn btn-primary h-9 flex-1 justify-center text-sm"
          onClick={save}
          disabled={pending}
        >
          {busy === "save" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
        <button
          className="btn h-9 flex-1 justify-center text-sm"
          onClick={emailProgress}
          disabled={pending}
        >
          {busy === "email" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending…
            </>
          ) : (
            "Email progress"
          )}
        </button>
      </div>
    </div>
  );
}
