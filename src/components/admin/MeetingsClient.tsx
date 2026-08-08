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
}: {
  clients: { id: string; name: string; company?: string | null }[];
  projects: { id: string; name: string; client_id: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    clientId: "",
    projectId: "",
    title: "",
    agenda: "",
    startsAt: "",
    durationMin: "30",
    joinUrl: "",
  });

  // Only that client's projects — offering every project in the agency is how
  // a call gets filed against the wrong one.
  const theirProjects = projects.filter((p) => p.client_id === f.clientId);

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
              placeholder="https://meet.google.com/… or a Zoom link"
            />
            <p className="mt-1 text-[11px] text-bone-400">
              Optional. Leave it empty and the invite says the link will follow.
            </p>
          </div>

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
            <label className="mono-tag mb-1.5 block">Agenda</label>
            <textarea
              className={`${field} min-h-[90px] resize-y`}
              value={f.agenda}
              onChange={(e) => setF({ ...f, agenda: e.target.value })}
              placeholder="What we will cover. The client reads this in the invite."
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
function Actions({ meetingId, title }: { meetingId: string; title: string }) {
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
function Notes({
  meetingId,
  notes,
  title = "",
  agenda = "",
}: {
  meetingId: string;
  notes: string;
  title?: string;
  agenda?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(notes);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="mt-2">
        {notes ? (
          <p className="whitespace-pre-line rounded-lg border border-ink-600 bg-ink-800/50 p-2.5 text-xs leading-relaxed text-bone-200">
            {notes}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mono-tag mt-1.5 inline-flex items-center gap-1 text-[11px] text-bone-400 hover:text-lime-400"
        >
          <NotebookPen size={11} /> {notes ? "Edit notes" : "Add notes"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="What was agreed. The client reads this word for word."
        className={`${field} min-h-[70px] resize-y text-xs`}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {/* Drafts into the box. It never writes notes on its own — a summary of
            a call nobody checked is worse than no summary. */}
        <AIAssist
          field="meeting_summary"
          getText={() => value}
          context={{ title, agenda }}
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
            setValue(notes);
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

MeetingsClient.Actions = Actions;
MeetingsClient.Notes = Notes;
