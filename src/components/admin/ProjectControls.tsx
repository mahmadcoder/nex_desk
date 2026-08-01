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

export default function ProjectControls({
  project, clientEmail,
}: { project: any; clientEmail: string }) {
  const [f, setF] = useState({
    status: project.status,
    staging_url: project.staging_url ?? "",
    live_url: project.live_url ?? "",
    deadline: project.deadline ?? "",
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
