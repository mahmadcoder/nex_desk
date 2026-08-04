"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";
import { asUuid, getSiteBaseUrl } from "@/lib/utils";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Actions a CLIENT takes in their own portal.
 *
 * All of them run with the service-role key, so ownership is proven against
 * the signed-in portal session on every call — the ids arrive from the
 * browser and cannot be trusted on their own. Errors are returned, never
 * thrown: production strips thrown messages.
 */

/** The signed-in portal user, and the client row they own containing this project. */
async function ownProject(projectId: string) {
  const db = createAdminClient();

  const id = asUuid(projectId);
  if (!id) return { error: "Invalid project reference." as string };

  const { data: project } = await db
    .from("projects")
    .select("*, clients(id, name, email, profile_id)")
    .eq("id", id)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  const client = (project.clients as any) ?? null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const owns =
    !!user &&
    (client?.profile_id === user.id ||
      client?.email?.toLowerCase() === user.email?.toLowerCase());

  if (!owns) return { error: "Sign in to your portal first." };
  return { db, project, client, userEmail: user!.email as string };
}

/* ============================================================
   MILESTONE APPROVAL
   ============================================================ */

/**
 * The client signs off a finished milestone.
 *
 * "The client approved it" used to live in a WhatsApp thread. This records
 * who, when, and against their signed-in session — and tells the admin, since
 * an approved milestone is usually the trigger to send the next stage invoice.
 */
export async function approveMilestone(
  milestoneId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = createAdminClient();

  const id = asUuid(milestoneId);
  if (!id) return { ok: false, error: "Invalid milestone reference." };

  const { data: milestone } = await db
    .from("milestones").select("id, title, is_done, approved_at, project_id").eq("id", id).maybeSingle();
  if (!milestone) return { ok: false, error: "Milestone not found." };
  if (!milestone.is_done) {
    return { ok: false, error: "This milestone is not finished yet — approval comes after delivery." };
  }
  if (milestone.approved_at) return { ok: false, error: "Already approved." };

  const own = await ownProject(milestone.project_id);
  if ("error" in own) return { ok: false, error: own.error };

  const { error } = await db.from("milestones").update({
    approved_at: new Date().toISOString(),
    approved_by: own.userEmail,
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recordAudit(null, "milestone.approved", "milestones", id, {
    title: milestone.title,
    by: own.userEmail,
  });

  await notify({
    kind: "milestone.approved",
    title: `${own.client.name} approved “${milestone.title}”`,
    body: "If a payment stage was tied to this milestone, it is ready to invoice.",
    href: `/${ADMIN}/projects/${milestone.project_id}`,
    entity: "milestones",
    entityId: id,
    actorLabel: own.client.name,
    actorKind: "client",
    clientId: own.client.id,
  });

  await sendEmail({
    templateKey: "admin_milestone_approved",
    to: await adminNotifyAddress(),
    clientId: own.client.id,
    projectId: milestone.project_id,
    vars: {
      client_name: own.client.name,
      project_name: own.project.name,
      milestone_title: milestone.title,
      admin_url: `${getSiteBaseUrl()}/${ADMIN}/projects/${milestone.project_id}`,
    },
  }).catch((e) => console.error("Milestone approval notice failed:", e));

  revalidatePath("/portal");
  revalidatePath(`/${ADMIN}/projects/${milestone.project_id}`);
  return { ok: true };
}

/* ============================================================
   KICKOFF CHECKLIST
   ============================================================ */

/**
 * The client ticks off something we asked for at kickoff.
 *
 * Unticking is allowed too — people tick by mistake — but every change is
 * recorded, and the admin is emailed once when the LAST item is ticked,
 * because that is the moment work can genuinely start.
 */
export async function toggleKickoffItem(
  projectId: string,
  itemId: string,
  done: boolean
): Promise<{ ok: boolean; error?: string; allDone?: boolean }> {
  const own = await ownProject(projectId);
  if ("error" in own) return { ok: false, error: own.error };

  const { db, project, client } = own;

  const items: any[] = Array.isArray(project.kickoff_items) ? project.kickoff_items : [];
  if (!items.length) return { ok: false, error: "This project has no kickoff checklist." };

  const wasAllDone = items.every((i) => i.done);
  const next = items.map((i) =>
    i.id === itemId ? { ...i, done, done_at: done ? new Date().toISOString() : null } : i
  );
  if (!next.some((i) => i.id === itemId)) {
    return { ok: false, error: "That item is not on the checklist." };
  }
  const allDone = next.every((i) => i.done);

  const { error } = await db.from("projects")
    .update({ kickoff_items: next })
    .eq("id", project.id);
  if (error) return { ok: false, error: error.message };

  const item = next.find((i) => i.id === itemId);
  const doneCount = next.filter((i) => i.done).length;

  // Every tick is now visible in the panel, one by one — the client sending
  // something is worth knowing about when it happens, not only when the last
  // one lands. Unticking is not: that is a correction, not news.
  //
  // Email stays reserved for completion. A message per tick would train
  // everyone to ignore the whole thread.
  if (done) {
    await notify({
      kind: allDone ? "kickoff.complete" : "kickoff.item",
      title: allDone
        ? `${client.name} has sent everything for ${project.name}`
        : `${client.name} ticked “${item?.label ?? "an item"}”`,
      body: allDone
        ? "All kickoff items are in — nothing is blocking the start of work."
        : `${doneCount} of ${next.length} kickoff items done.`,
      href: `/${ADMIN}/projects/${project.id}`,
      entity: "projects",
      entityId: project.id,
      actorLabel: client.name,
      actorKind: "client",
      clientId: client.id,
      meta: { item: item?.label ?? null, done: doneCount, total: next.length },
    });
  }

  await recordAudit(null, "kickoff.toggle", "projects", project.id, {
    item: item?.label ?? itemId,
    done,
    client: client.name,
  });

  // One email at the moment of completion, not one per tick.
  if (allDone && !wasAllDone) {
    await sendEmail({
      templateKey: "admin_kickoff_complete",
      to: await adminNotifyAddress(),
      clientId: client.id,
      projectId: project.id,
      vars: {
        client_name: client.name,
        project_name: project.name,
        admin_url: `${getSiteBaseUrl()}/${ADMIN}/projects/${project.id}`,
      },
    }).catch((e) => console.error("Kickoff-complete notice failed:", e));
  }

  revalidatePath("/portal");
  revalidatePath(`/${ADMIN}/projects/${project.id}`);
  return { ok: true, allDone };
}
