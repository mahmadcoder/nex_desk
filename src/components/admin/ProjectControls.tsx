"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateProject, sendProgressUpdate } from "@/lib/actions";

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

  const save = () => start(async () => {
    await updateProject(project.id, {
      ...f,
      deadline: f.deadline || null,
      delivered_at: f.status === "delivered" ? new Date().toISOString() : project.delivered_at,
    });
    toast.success("Project updated.");
  });

  // Content (recent shared work logs + milestone state) is assembled on the
  // server so the email matches what the client sees in their portal.
  const emailProgress = () => start(async () => {
    try {
      const res = await sendProgressUpdate(project.id);
      res.ok
        ? toast.success(`Progress update sent to ${clientEmail}.`)
        : toast.error(res.error ?? "Send failed.");
    } catch (e: any) {
      toast.error(e?.message ?? "Send failed.");
    }
  });

  return (
    <div className="card space-y-4 p-5">
      <div>
        <label className="mono-tag mb-1.5 block">Status</label>
        <select className={field} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
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

      <div className="flex gap-2 border-t border-ink-600 pt-4">
        <button className="btn btn-primary h-9 flex-1 justify-center text-xs" onClick={save} disabled={pending}>
          Save changes
        </button>
        <button className="btn h-9 flex-1 justify-center text-xs" onClick={emailProgress} disabled={pending}>
          Email progress
        </button>
      </div>
    </div>
  );
}
