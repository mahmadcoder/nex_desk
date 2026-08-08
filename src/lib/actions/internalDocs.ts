"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/actions/audit";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";
const BUCKET = "staff-docs";

/**
 * The handbook: SOPs, brand guidelines, policies, templates.
 *
 * Staff-only by construction — `internal_docs` has no `client_id` and never
 * will. `documents` is client-scoped and `project_files` is project-scoped, so
 * before this there was nowhere for "how we run a kickoff" to live except
 * somebody's laptop.
 *
 * Every employee reads; owner/admin write. An SOP anyone can quietly edit is
 * not an SOP.
 */

export async function listInternalDocs() {
  await requireStaff();

  const db = createAdminClient();
  const { data, error } = await db
    .from("internal_docs")
    .select("*")
    .order("category")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code !== "42P01") console.error("listInternalDocs failed", error);
    return [];
  }

  // Signed here through the service role: the bucket is private and staff have
  // no direct read on it, the same arrangement as `documents`.
  return Promise.all(
    (data ?? []).map(async (d) => {
      if (!d.storage_path) return { ...d, url: d.link_url ?? null };
      try {
        const { data: signed } = await db.storage
          .from(BUCKET)
          .createSignedUrl(d.storage_path, 3600, { download: d.title });
        return { ...d, url: signed?.signedUrl ?? null };
      } catch {
        return { ...d, url: null };
      }
    })
  );
}

export async function addInternalDoc(input: {
  title: string;
  description?: string | null;
  category: string;
  storagePath?: string | null;
  linkUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}) {
  const me = await requireOwnerAdmin();

  if (!input.title?.trim()) return { ok: false as const, error: "Give it a title." };
  if (!input.storagePath && !input.linkUrl?.trim()) {
    return { ok: false as const, error: "Upload a file or paste a link." };
  }

  const { data, error } = await createAdminClient()
    .from("internal_docs")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category || "resource",
      storage_path: input.storagePath || null,
      link_url: input.linkUrl?.trim() || null,
      mime_type: input.mimeType ?? null,
      file_size: input.fileSize ?? null,
      uploaded_by: me.userId,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "42P01"
          ? "The handbook needs its table — run supabase/idempotent_fixes_2027_29.sql."
          : error.message,
    };
  }

  await recordAudit(me.userId, "internal_doc.add", "internal_docs", data.id, {
    title: input.title,
    category: input.category,
  });

  revalidatePath(`/${ADMIN}/handbook`);
  return { ok: true as const, id: data.id };
}

export async function deleteInternalDoc(id: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { data: row } = await db
    .from("internal_docs")
    .select("id, title, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { ok: false as const, error: "That is already gone." };

  // Storage first — a deleted row with a surviving object leaves nothing
  // pointing at the file to try again with.
  if (row.storage_path) {
    const { error: storageError } = await db.storage.from(BUCKET).remove([row.storage_path]);
    if (storageError) console.error("deleteInternalDoc: storage remove failed", storageError);
  }

  const { error } = await db.from("internal_docs").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await recordAudit(me.userId, "internal_doc.delete", "internal_docs", id, { title: row.title });
  revalidatePath(`/${ADMIN}/handbook`);
  return { ok: true as const };
}
