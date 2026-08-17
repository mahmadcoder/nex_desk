"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, X, Loader2, NotebookPen } from "lucide-react";
import Modal from "@/components/admin/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import { createMeeting, cancelMeeting, setMeetingNotes } from "@/lib/actions/meetings";
import { TZ_LABEL } from "@/lib/datetime";
import AIAssist from "@/components/ui/AIAssist";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none";

const DURATIONS = ["15", "30", "45", "60", "90"];

/**
 * Booking a call.
 *
 * No provider integration on purpose: a pasted Zoom/Meet/Whereby link works
 * with whatever the client already uses and cannot break when an API changes.
 * The calendar invite is generated as a `.ics` attachment instead, which every
 * mail client understands.
 */
export default function MeetingsClient({
  clients,
  projects,
  employees = [],
}: {
  clients: { id: string; name: string; company?: string | null }[];
  projects: { id: string; name: string; client_id: string }[];
  employees?: { id: string; full_name: string; job_title?: string | null; assigned_client_ids?: string[] }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [f, setF] = useState({
    clientId: "",
    projectId: "",
    title: "",
    agenda: "",
    startsAt: "",
    durationMin: "30",
    joinUrl: "",
  });

  // Only that client's projects
  const theirProjects = projects.filter((p) => p.client_id === f.clientId);

  // Priority sorting: employees assigned to this client first, then others
  const filteredEmployees = employees.filter((e) =>
    e.full_name.toLowerCase().includes(staffSearch.toLowerCase())
  );
  const assignedTeam = filteredEmployees.filter(
    (e) => f.clientId && e.assigned_client_ids?.includes(f.clientId)
  );
  const otherTeam = filteredEmployees.filter(
    (e) => !f.clientId || !e.assigned_client_ids?.includes(f.clientId)
  );

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = () =>
    start(async () => {
      const res = await createMeeting({
        clientId: f.clientId,
        projectId: f.projectId || null,
        title: f.title,
        agenda: f.agenda,
        startsAt: f.startsAt,
        durationMin: Number(f.durationMin),
        joinUrl: f.joinUrl,
        staffIds: selectedStaffIds,
      });

      if (!res.ok) {
        toast.error(res.error ?? "Could not book that.");
        return;
      }
      toast.success(
        res.emailed
          ? `Booked — ${res.emailed} invite${res.emailed === 1 ? "" : "s"} sent.`
          : "Booked, but no invites went out. Check the Email Centre."
      );
      setOpen(false);
      setF({
        clientId: "",
        projectId: "",
        title: "",
        agenda: "",
        startsAt: "",
        durationMin: "30",
        joinUrl: "",
      });
      router.refresh();
    });

  return (
    <>
      <button className="btn btn-primary gap-2" onClick={() => setOpen(true)}>
        <CalendarPlus size={15} /> Book a meeting
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        title="Book a meeting"
        description={`The client, you, and only the staff assigned to that client get an email with a calendar invite attached. Times are ${TZ_LABEL}.`}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={pending || !f.clientId || !f.title.trim() || !f.startsAt}
            >
              {pending ? "Booking…" : "Book & send invites"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mono-tag mb-1.5 block">Client</label>
            <CustomSelect
              value={f.clientId}
              onChange={(v) => setF({ ...f, clientId: v, projectId: "" })}
              options={clients.map((c) => ({
                value: c.id,
                label: c.company ? `${c.name} — ${c.company}` : c.name,
              }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mono-tag mb-1.5 block">Title</label>
            <input
              className={field}
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              placeholder="Milestone 2 walkthrough"
            />
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">When ({TZ_LABEL})</label>
            <input
              className={field}
              type="datetime-local"
              value={f.startsAt}
              onChange={(e) => setF({ ...f, startsAt: e.target.value })}
            />
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">Length</label>
            <CustomSelect
              value={f.durationMin}
              onChange={(v) => setF({ ...f, durationMin: v })}
              options={DURATIONS.map((d) => ({ value: d, label: `${d} minutes` }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mono-tag mb-1.5 block">Join link</label>
            <input
              className={field}
              value={f.joinUrl}
              onChange={(e) => setF({ ...f, joinUrl: e.target.value })}
              placeholder="e.g. meet.google.com/abc-def or a Zoom link"
            />
            <p className="mt-1 text-[11px] text-bone-400">
              Optional. Paste Google Meet, Zoom, or Teams link. It will open as an external link for attendees.
            </p>
          </div>

          {/* Multi-Staff Selection with Priority Sorting */}
          {employees.length > 0 && (
            <div className="sm:col-span-2 rounded-lg border border-ink-600 bg-ink-800/40 p-3">
              <label className="mono-tag mb-1.5 block text-xs">Invite Staff / Team Members (Optional)</label>

              {/* Selected Pills */}
              {selectedStaffIds.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {selectedStaffIds.map((id) => {
                    const emp = employees.find((e) => e.id === id);
                    if (!emp) return null;
                    return (
                      <span
                        key={id}
                        className="mono-tag inline-flex items-center gap-1 rounded-full border border-lime-400/40 bg-lime-400/10 px-2.5 py-0.5 text-[11px] text-lime-300"
                      >
                        {emp.full_name}
                        <button
                          type="button"
                          onClick={() => toggleStaff(id)}
                          className="ml-1 text-bone-400 hover:text-rose-400"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <input
                className={`${field} text-xs py-1.5 mb-2`}
                placeholder="Type name to search staff..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />

              <div className="max-h-36 overflow-y-auto space-y-2 pr-1 text-xs">
                {assignedTeam.length > 0 && (
                  <div>
                    <p className="mono-tag mb-1 text-[10px] text-lime-400 font-semibold">
                      ⭐ Assigned to this Project / Client ({assignedTeam.length})
                    </p>
                    <div className="space-y-1">
                      {assignedTeam.map((e) => (
                        <label
                          key={e.id}
                          className="flex cursor-pointer items-center justify-between rounded p-1.5 hover:bg-ink-700/50"
                        >
                          <span className="text-bone-100 font-medium">{e.full_name}</span>
                          <input
                            type="checkbox"
                            checked={selectedStaffIds.includes(e.id)}
                            onChange={() => toggleStaff(e.id)}
                            className="accent-lime-400 h-3.5 w-3.5"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  {assignedTeam.length > 0 && (
                    <p className="mono-tag mb-1 text-[10px] text-bone-400">Other Agency Staff</p>
                  )}
                  <div className="space-y-1">
                    {otherTeam.map((e) => (
                      <label
                        key={e.id}
                        className="flex cursor-pointer items-center justify-between rounded p-1.5 hover:bg-ink-700/50"
                      >
                        <span className="text-bone-200">{e.full_name}</span>
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.includes(e.id)}
                          onChange={() => toggleStaff(e.id)}
                          className="accent-lime-400 h-3.5 w-3.5"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {theirProjects.length > 0 && (
            <div className="sm:col-span-2">
              <label className="mono-tag mb-1.5 block">Project (optional)</label>
              <CustomSelect
                value={f.projectId}
                onChange={(v) => setF({ ...f, projectId: v })}
                options={[
                  { value: "", label: "Not about one project" },
                  ...theirProjects.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="mono-tag block text-[11px] text-bone-200">Meeting Agenda & Topics</label>
              <span className="mono-tag text-[9px] text-bone-400">Optional · Sent in invite</span>
            </div>
            <p className="text-[11px] text-bone-400 mb-1.5 leading-relaxed">
              What will be discussed during this call. Attendees (client & team) will receive this in their calendar invite.
            </p>
            <textarea
              className={`${field} min-h-[90px] resize-y placeholder:text-bone-500 text-bone-50`}
              value={f.agenda}
              onChange={(e) => setF({ ...f, agenda: e.target.value })}
              placeholder={"e.g.\n1. Review sprint deliverables and current progress\n2. Discuss design feedback on UI wireframes\n3. Align on next milestones and deadlines"}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * Cancel, on a row.
 *
 * Attached to the parent so the meetings page imports one component. The
 * cancellation sends a CANCEL invite that removes the event from every
 * attendee's calendar — there is nothing for them to tidy up.
 */
export function MeetingActions({ meetingId, title }: { meetingId: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mono-tag inline-flex items-center gap-1 text-[11px] text-bone-400 hover:text-rose-400"
      >
        <X size={11} /> Cancel
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        title="Cancel this meeting?"
        description={`"${title}" will be removed from everyone's calendar automatically.`}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Keep it
            </button>
            <button
              className="btn btn-primary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await cancelMeeting(meetingId, reason.trim() || undefined);
                  if (!res.ok) toast.error(res.error ?? "Could not cancel.");
                  else toast.success("Cancelled — everyone has been told.");
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Cancelling…
                </span>
              ) : (
                "Cancel meeting"
              )}
            </button>
          </>
        }
      >
        <label className="mono-tag mb-1.5 block">Reason (optional)</label>
        <input
          className={field}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Something came up — we will rebook this week."
        />
        <p className="mt-1.5 text-[11px] text-bone-400">
          Goes into the email. A cancellation with a reason reads very differently from one
          without.
        </p>
      </Modal>
    </>
  );
}

/**
 * Minutes, after the call.
 *
 * Saves through `setMeetingNotes`, which deliberately does NOT touch
 * `sequence` or re-announce — typing up what was agreed must never fire a
 * fresh calendar invite at everyone who attended.
 */
export function MeetingNotes({
  meetingId,
  notes,
}: {
  meetingId: string;
  notes?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes ?? "");
  const [pending, start] = useTransition();

  if (!editing) {
    return (
      <div className="group rounded-lg border border-ink-600 bg-ink-900/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="mono-tag text-[10px] text-lime-400 font-semibold flex items-center gap-1.5">
            <NotebookPen size={12} /> Post-Meeting Notes &amp; Decisions
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mono-tag text-[11px] text-lime-400 hover:underline"
          >
            {notes ? "Edit" : "+ Add post-call notes"}
          </button>
        </div>
        {notes ? (
          <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-bone-200">{notes}</p>
        ) : (
          <p className="mt-1.5 text-xs text-bone-500 italic">No post-call notes recorded yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-lime-400/30 bg-ink-900/90 p-3">
      <div className="flex items-center justify-between">
        <label className="mono-tag text-[10px] text-lime-400 font-semibold flex items-center gap-1.5">
          <NotebookPen size={12} /> Post-Meeting Notes &amp; Decisions
        </label>
        <span className="mono-tag text-[9px] text-bone-400">Recorded after call</span>
      </div>
      <textarea
        className={`${field} min-h-24 font-mono text-xs placeholder:text-bone-500 text-bone-50`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What was decided? Next action items? Paste call notes here..."
      />
      <div className="flex items-center justify-between gap-2">
        <AIAssist
          field="meeting_summary"
          getText={() => value}
          context={{ notes: value }}
          onApply={(t) => setValue(t)}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setMeetingNotes(meetingId, value);
              if (!res.ok) toast.error(res.error ?? "Could not save.");
              else {
                toast.success("Notes saved. No invite was re-sent.");
                setEditing(false);
              }
              router.refresh();
            })
          }
          className="btn btn-primary h-7 px-3 text-[11px]"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setValue(notes ?? "");
            setEditing(false);
          }}
          className="mono-tag text-[11px] text-bone-400 hover:text-bone-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
