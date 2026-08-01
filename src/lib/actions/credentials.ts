"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { asUuid } from "@/lib/utils";
import { encryptCredentials, decryptCredentials, type Credential } from "@/lib/crypto";
import { recordAudit } from "@/lib/actions/audit";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * The client's own infrastructure logins — hosting, domain registrar,
 * analytics, mail — held until handover transfers them.
 *
 * `projects.credentials` was read by the handover PDF and written by nothing,
 * so every handover pack has shipped with an empty credentials section since
 * launch. This is the missing half.
 *
 * Owner/admin only, and encrypted at rest: this is the single most damaging
 * thing in the database if it leaks, because it is not our access being given
 * away, it is our clients'.
 */

export async function saveProjectCredentials(projectId: string, items: Credential[]) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(projectId);
  if (!id) throw new Error("Invalid project reference.");

  // Drop blank rows so an empty form does not persist noise into the PDF.
  const clean = (items ?? [])
    .map((c) => ({
      label: (c.label ?? "").trim(),
      username: (c.username ?? "").trim(),
      secret: c.secret ?? "",
      url: (c.url ?? "").trim(),
      note: (c.note ?? "").trim(),
    }))
    .filter((c) => c.label || c.username || c.secret || c.url);

  await db.from("projects")
    .update({ credentials: encryptCredentials(clean) })
    .eq("id", id);

  // The values themselves are never written to the audit log — only that they
  // changed, and by whom.
  await recordAudit(
    me.userId,
    "project.credentials",
    "projects",
    id,
    { count: clean.length }
  );

  revalidatePath(`/${ADMIN}/projects/${id}`);
  return { ok: true as const, count: clean.length };
}

/**
 * Decrypts for editing. Kept as an explicit, audited action rather than
 * shipping plaintext into the page on every render — the secrets only cross
 * the wire when someone deliberately opens the editor.
 */
export async function revealProjectCredentials(projectId: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(projectId);
  if (!id) throw new Error("Invalid project reference.");

  const { data: project } = await db
    .from("projects").select("credentials").eq("id", id).maybeSingle();
  if (!project) throw new Error("Project not found.");

  await recordAudit(
    me.userId,
    "project.credentials.reveal",
    "projects",
    id,
    {}
  );

  return { ok: true as const, items: decryptCredentials(project.credentials as Credential[]) };
}
