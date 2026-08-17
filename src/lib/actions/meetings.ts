"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { getSiteBaseUrl } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";
import { fmtDateTime, TZ_LABEL } from "@/lib/datetime";
import { icsAttachment } from "@/lib/ics";
import { getAgency } from "@/lib/agency";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/* ============================================================
   MEETINGS
   ============================================================ */

/**
 * Who hears about a meeting.
 *
 * The client, the admin inbox, and **only the staff assigned to that client** —
 * not everyone. An agency where every developer is emailed about every client's
 * calls is one where people stop reading the emails.
 *
 * `client_employee_assignments` is the existing source of that truth; this is
 * the reverse of `assignedClientIds` in `auth/staff.ts`.
 */
async function meetingRecipients(clientId: string, staffIds: string[] = []) {
  const db = createAdminClient();

  const [{ data: client }, { data: assignedRows }, { data: explicitStaffRows }, adminEmail] = await Promise.all([
    db.from("clients").select("id, name, email").eq("id", clientId).maybeSingle(),
    db
      .from("client_employee_assignments")
      .select("employees(id, full_name, email, employment_status)")
      .eq("client_id", clientId),
    staffIds.length
      ? db
          .from("employees")
          .select("id, full_name, email, employment_status")
          .in("id", staffIds)
      : Promise.resolve({ data: [] as any[] }),
    adminNotifyAddress(),
  ]);

  const assignedEmployees = (assignedRows ?? []).map((r: any) => r.employees);
  const explicitEmployees = explicitStaffRows ?? [];
  const combined = [...assignedEmployees, ...explicitEmployees];

  const staff = Array.from(
    new Map(
      combined
        .filter((e: any) => e?.email && e.employment_status !== "inactive")
        .map((e: any) => [e.email.toLowerCase(), e])
    ).values()
  ) as any[];

  return { client, staff, adminEmail };
}

function meetingVars(m: any, client: any, joinLine: string) {
  return {
    client_name: client?.name ?? "there",
    title: m.title,
    when: `${fmtDateTime(m.starts_at)} (${TZ_LABEL})`,
    duration: `${m.duration_min} minutes`,
    agenda: m.agenda?.trim() || "No agenda set — we will keep it short.",
    join: joinLine,
    portal_url: `${getSiteBaseUrl()}/portal/meetings`,
  };
}

export async function createMeeting(input: {
  clientId: string;
  projectId?: string | null;
  title: string;
  agenda?: string | null;
  startsAt: string;
  durationMin: number;
  joinUrl?: string | null;
  staffIds?: string[];
}) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  if (!input.title?.trim()) return { ok: false as const, error: "Give the meeting a title." };
  if (!input.startsAt) return { ok: false as const, error: "Pick a date and time." };

  const { data: meeting, error } = await db
    .from("meetings")
    .insert({
      client_id: input.clientId,
      project_id: input.projectId || null,
      title: input.title.trim(),
      agenda: input.agenda?.trim() || null,
      starts_at: new Date(input.startsAt).toISOString(),
      duration_min: input.durationMin || 30,
      join_url: input.joinUrl?.trim() || null,
      created_by: me.userId,
      staff_ids: input.staffIds || [],
    })
    .select("*")
    .single();

  if (error) {
    // 42P01 = the table is not there yet. Named so a missing migration reads as
    // a missing migration.
    return {
      ok: false as const,
      error:
        error.code === "42P01"
          ? "Meetings needs its table — run supabase/idempotent_fixes_2027_37.sql."
          : error.message,
    };
  }

  const emailed = await announce(meeting, "scheduled");

  await recordAudit(me.userId, "meeting.create", "meetings", meeting.id, {
    title: meeting.title,
    starts_at: meeting.starts_at,
  });

  revalidateMeetingPaths(input.clientId, input.projectId);
  return { ok: true as const, id: meeting.id, emailed };
}

export async function rescheduleMeeting(
  id: string,
  patch: { title?: string; agenda?: string | null; startsAt?: string; durationMin?: number; joinUrl?: string | null }
) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { data: before } = await db.from("meetings").select("*").eq("id", id).maybeSingle();
  if (!before) return { ok: false as const, error: "That meeting no longer exists." };
  if (before.status === "cancelled")
    return { ok: false as const, error: "That meeting was cancelled. Create a new one." };

  const next: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.agenda !== undefined) next.agenda = patch.agenda?.trim() || null;
  if (patch.startsAt) next.starts_at = new Date(patch.startsAt).toISOString();
  if (patch.durationMin) next.duration_min = patch.durationMin;
  if (patch.joinUrl !== undefined) next.join_url = patch.joinUrl?.trim() || null;

  // Only a change to WHEN it happens is a reschedule. Bumping SEQUENCE for a
  // typo fix would re-prompt every attendee to accept again; not bumping it for
  // a real move means their calendar keeps the old time silently.
  const timeMoved =
    (!!next.starts_at && next.starts_at !== before.starts_at) ||
    (!!next.duration_min && next.duration_min !== before.duration_min);
  if (timeMoved) next.sequence = Number(before.sequence ?? 0) + 1;

  const { data: meeting, error } = await db
    .from("meetings")
    .update(next)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false as const, error: error.message };

  const emailed = await announce(meeting, timeMoved ? "moved" : "updated");

  await recordAudit(me.userId, "meeting.update", "meetings", id, {
    from: before.starts_at,
    to: meeting.starts_at,
    timeMoved,
  });

  revalidateMeetingPaths(meeting.client_id, meeting.project_id);
  return { ok: true as const, emailed };
}

export async function cancelMeeting(id: string, reason?: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { data: before } = await db.from("meetings").select("*").eq("id", id).maybeSingle();
  if (!before) return { ok: false as const, error: "That meeting no longer exists." };

  const { data: meeting, error } = await db
    .from("meetings")
    .update({
      status: "cancelled",
      // Still increments: a CANCEL whose sequence has not moved is ignored by
      // some calendar clients, leaving a dead event in the attendee's diary.
      sequence: Number(before.sequence ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false as const, error: error.message };

  const emailed = await announce(meeting, "cancelled", reason);

  await recordAudit(me.userId, "meeting.cancel", "meetings", id, { reason: reason ?? null });
  revalidateMeetingPaths(meeting.client_id, meeting.project_id);
  return { ok: true as const, emailed };
}

/**
 * Tell everyone, with a calendar invite attached.
 *
 * Best-effort throughout: a mail failure must never undo a meeting that is
 * already in the database. `sendEmail` retries transient SMTP failures on its
 * own and logs the rest.
 */
async function announce(
  meeting: any,
  kind: "scheduled" | "moved" | "updated" | "cancelled",
  reason?: string
): Promise<number> {
  try {
    const { client, staff, adminEmail } = await meetingRecipients(meeting.client_id, meeting.staff_ids || []);
    const agency = await getAgency();
    const cancelled = kind === "cancelled";

    const invite = icsAttachment({
      id: meeting.id,
      title: meeting.title,
      agenda: cancelled && reason ? `Cancelled — ${reason}` : meeting.agenda,
      startsAt: meeting.starts_at,
      durationMin: meeting.duration_min,
      joinUrl: meeting.join_url,
      sequence: Number(meeting.sequence ?? 0),
      organiser: { name: agency.name, email: agency.email },
      attendees: [
        client?.email ? { name: client.name, email: client.email } : null,
        ...staff.map((s) => ({ name: s.full_name, email: s.email })),
      ].filter(Boolean) as { name?: string | null; email: string }[],
      status: cancelled ? "CANCELLED" : "CONFIRMED",
    });

    const joinLine = meeting.join_url
      ? meeting.join_url
      : "The join link will follow before the call.";
    const vars = meetingVars(meeting, client, joinLine);
    const templateKey = cancelled ? "meeting_cancelled" : "meeting_scheduled";

    const subjectPrefix =
      kind === "cancelled" ? "Cancelled" : kind === "moved" ? "Moved" : kind === "updated" ? "Updated" : null;

    // Deduped: an admin who is also the assigned employee gets one email, not
    // two identical ones with two invites.
    const recipients = Array.from(
      new Set(
        [client?.email, adminEmail, ...staff.map((s) => s.email)]
          .filter(Boolean)
          .map((e) => String(e).toLowerCase())
      )
    );

    let sent = 0;
    for (const to of recipients) {
      const res = await sendEmail({
        templateKey,
        to,
        clientId: meeting.client_id,
        projectId: meeting.project_id ?? undefined,
        vars: { ...vars, reason: reason ?? "" },
        subjectOverride: subjectPrefix
          ? `${subjectPrefix}: ${meeting.title} — ${vars.when}`
          : undefined,
        rawAttachments: [invite],
      });
      if (res.ok) sent++;
    }

    await notify({
      kind: "meeting.scheduled",
      title: cancelled ? `Meeting cancelled — ${meeting.title}` : `Meeting ${kind} — ${meeting.title}`,
      body: `${client?.name ?? "Client"} · ${vars.when}`,
      href: `/${ADMIN}/meetings`,
      entity: "meetings",
      entityId: meeting.id,
      clientId: meeting.client_id,
      actorKind: "staff",
    });

    return sent;
  } catch (e) {
    console.error("meeting announce failed:", e);
    return 0;
  }
}

function revalidateMeetingPaths(clientId: string, projectId?: string | null) {
  revalidatePath(`/${ADMIN}/meetings`);
  revalidatePath(`/${ADMIN}/clients/${clientId}`);
  if (projectId) revalidatePath(`/${ADMIN}/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/meetings");
}

/**
 * What was agreed, written after the call.
 *
 * Deliberately not merged into `rescheduleMeeting`: notes are added days later
 * and must never bump `sequence` or re-email anyone. Nobody wants a fresh
 * calendar invite because someone typed up minutes.
 */
export async function setMeetingNotes(id: string, notes: string) {
  const me = await requireOwnerAdmin();

  const { data, error } = await createAdminClient()
    .from("meetings")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("client_id, project_id")
    .single();

  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "42703"
          ? "Meeting notes needs its column — run supabase/idempotent_fixes_2027_25.sql."
          : error.message,
    };
  }

  await recordAudit(me.userId, "meeting.notes", "meetings", id, { chars: notes.trim().length });
  revalidateMeetingPaths(data.client_id, data.project_id);
  return { ok: true as const };
}
