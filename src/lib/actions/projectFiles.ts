"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/actions/audit";
import { notifyClientGrouped } from "@/lib/actions/notifyClient";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";
const BUCKET = "project-files";

/**
 * Files against a project.
 *
 * `project_files` and the `project-files` bucket have both existed since the
 * beginning with nothing using them, so there has never been a way to hand a
 * client a deliverable except email or WhatsApp. `documents` is not the same
 * thing — it is client-scoped agreements and generated PDFs, not per-project
 * working files.
 */

export async function recordProjectFile(input: {
  projectId: string;
  name: string;
  storagePath: string;
  mimeType?: string | null;
  fileSize?: number | null;
  description?: string | null;
  /** proposal | contract | nda | design | source | assets | other */
  kind?: string;
  /** Optional. A task attachment is still a project file and still obeys
      visible_to_client — attaching to a task is not a way around that. */
  taskId?: string | null;
  visibleToClient: boolean;
}) {
  const me = await requireStaff();
  const db = createAdminClient();

  const { data, error } = await db
    .from("project_files")
    .insert({
      project_id: input.projectId,
      name: input.name,
      storage_path: input.storagePath,
      mime_type: input.mimeType ?? null,
      file_size: input.fileSize ?? null,
      description: input.description?.trim() || null,
      kind: input.kind || "other",
      task_id: input.taskId || null,
      visible_to_client: input.visibleToClient,
      uploaded_by: me.userId,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "42703"
          ? "Project files needs its columns — run supabase/idempotent_fixes_2027_24.sql."
          : error.message,
    };
  }

  await recordAudit(me.userId, "project_file.upload", "project_files", data.id, {
    project_id: input.projectId,
    name: input.name,
    visible_to_client: input.visibleToClient,
  });

  // An internal file is not the client's business, so it never notifies.
  if (input.visibleToClient) {
    const { data: project } = await db
      .from("projects")
      .select("name, client_id")
      .eq("id", input.projectId)
      .maybeSingle();

    if (project?.client_id) {
      // Grouped: uploading seven assets should leave one line in the bell, not
      // seven, or a batch buries everything else in it.
      await notifyClientGrouped({
        clientId: project.client_id,
        kind: "file.shared",
        title: (count) =>
          count === 1
            ? `New file — ${input.name}`
            : `${count} new files on ${project.name}`,
        body: project.name,
        href: `/portal/projects/${input.projectId}?tab=files`,
        entityId: input.projectId,
      });
    }
  }

  revalidatePath(`/${ADMIN}/projects/${input.projectId}`);
  revalidatePath(`/portal/projects/${input.projectId}`);
  return { ok: true as const, id: data.id };
}

/**
 * Show or hide a file from the client.
 *
 * Owner/admin only. Whether a client can see a deliverable is a relationship
 * decision, not one for whoever happened to upload it.
 */
export async function setProjectFileVisibility(id: string, visible: boolean) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { data, error } = await db
    .from("project_files")
    .update({ visible_to_client: visible })
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await recordAudit(me.userId, "project_file.visibility", "project_files", id, { visible });
  revalidatePath(`/${ADMIN}/projects/${data.project_id}`);
  revalidatePath(`/portal/projects/${data.project_id}`);
  return { ok: true as const };
}

export async function deleteProjectFile(id: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { data: row } = await db
    .from("project_files")
    .select("id, project_id, name, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { ok: false as const, error: "That file is already gone." };

  // Storage first. If the row went first and this failed, the object would be
  // orphaned with nothing pointing at it to try again.
  const { error: storageError } = await db.storage.from(BUCKET).remove([row.storage_path]);
  if (storageError) {
    console.error("deleteProjectFile: storage remove failed", storageError);
  }

  const { error } = await db.from("project_files").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await recordAudit(me.userId, "project_file.delete", "project_files", id, { name: row.name });
  revalidatePath(`/${ADMIN}/projects/${row.project_id}`);
  revalidatePath(`/portal/projects/${row.project_id}`);
  return { ok: true as const };
}

/**
 * Files for a project, each with a signed URL.
 *
 * The bucket is private and its RLS policy is staff-only, so the client portal
 * cannot read it directly — signing here through the service role is what lets
 * a client download without opening the bucket up. Same pattern as `documents`.
 */
export async function listProjectFiles(
  projectId: string,
  { clientView = false, taskId }: { clientView?: boolean; taskId?: string } = {}
) {
  const db = createAdminClient();

  let q = db
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (clientView) q = q.eq("visible_to_client", true);
  if (taskId) q = q.eq("task_id", taskId);

  const { data, error } = await q;
  if (error) {
    if (error.code !== "42P01") console.error("listProjectFiles failed", error);
    return [];
  }

  return Promise.all(
    (data ?? []).map(async (f) => {
      try {
        const { data: signed } = await db.storage
          .from(BUCKET)
          .createSignedUrl(f.storage_path, 3600, { download: f.name });
        return { ...f, url: signed?.signedUrl ?? null };
      } catch {
        return { ...f, url: null };
      }
    })
  );
}
