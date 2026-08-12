"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  recordProjectFile,
  setProjectFileVisibility,
  setProjectFileStaffVisibility,
  deleteProjectFile,
} from "@/lib/actions/projectFiles";
import { fmtDate } from "@/lib/datetime";
import CustomSelect from "@/components/ui/CustomSelect";
import { Upload, Download, Trash2, Eye, EyeOff, Loader2, Paperclip, UserCheck, UserX } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BUCKET = "project-files";
const MAX_MB = 25;

// Mirrors project_files_kind_check. The client sees these as group headings on
// their Files tab, so "other" is a last resort rather than a default to reach
// for.
const KINDS = [
  ["design", "UI Design"],
  ["source", "Source Code"],
  ["assets", "Assets"],
  ["nda", "NDA"],
  ["proposal", "Proposal"],
  ["contract", "Contract"],
  ["other", "Other"],
] as const;

function size(bytes?: number | null) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Deliverables against a project.
 *
 * Uploaded straight to the private `project-files` bucket from the browser, so
 * a 20MB design file never travels through a server action's payload limit.
 * The row is recorded afterwards — which means a failed upload leaves no row
 * claiming a file that is not there.
 */
export default function ProjectFilesPanel({
  projectId,
  files,
  canManage,
}: {
  projectId: string;
  files: any[];
  canManage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [visible, setVisible] = useState(true);
  const [visibleStaff, setVisibleStaff] = useState(true);
  const [kind, setKind] = useState<string>("design");
  const [pending, start] = useTransition();

  const upload = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`That file is over ${MAX_MB}MB. Send a link instead.`);
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}…`);
    try {
      // Scoped per project: a flat prefix would let one project's upload
      // overwrite another's file of the same name.
      const path = `${projectId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await createClient().storage.from(BUCKET).upload(path, file);
      if (error) throw error;

      const res = await recordProjectFile({
        projectId,
        name: file.name,
        storagePath: path,
        mimeType: file.type || null,
        fileSize: file.size,
        kind,
        visibleToClient: visible,
        visibleToStaff: visibleStaff,
      });
      if (!res.ok) throw new Error(res.error);

      toast.success("Uploaded successfully.", { id: toastId });
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed.", { id: toastId });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-ink-600 bg-ink-800/50 p-3.5">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="btn btn-primary h-9 gap-1.5 px-4 text-sm"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {uploading ? "Uploading…" : "Upload a file"}
          </button>

          <div className="w-full sm:w-[150px]">
            <CustomSelect
              value={kind}
              onChange={setKind}
              className="py-1.5 text-xs"
              options={KINDS.map(([value, label]) => ({ value, label }))}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-bone-300">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
              className="accent-lime-400"
            />
            Visible to client
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-bone-300">
            <input
              type="checkbox"
              checked={visibleStaff}
              onChange={(e) => setVisibleStaff(e.target.checked)}
              className="accent-lime-400"
            />
            Visible to staff
          </label>

          <span className="mono-tag ml-auto text-[10px] text-bone-500">max {MAX_MB}MB</span>
        </div>
      )}

      {files.length ? (
        <ul className="divide-y divide-ink-600">
          {files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <Paperclip size={14} className="shrink-0 text-bone-400" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-bone-100">{f.name}</p>
                  <p className="mono-tag text-[10px]">
                    {fmtDate(f.created_at)}
                    {f.file_size ? ` · ${size(f.file_size)}` : ""}
                    {f.kind && f.kind !== "other" ? ` · ${f.kind}` : ""}
                    {canManage && !f.visible_to_client ? " · hidden from client" : ""}
                    {canManage && f.visible_to_staff === false ? " · hidden from staff" : ""}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {f.url && (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mono-tag inline-flex items-center gap-1 text-[11px] text-lime-400 hover:underline"
                  >
                    <Download size={12} /> Download
                  </a>
                )}

                {canManage && (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      title={f.visible_to_client ? "Hide from client" : "Show to client"}
                      onClick={() =>
                        start(async () => {
                          const res = await setProjectFileVisibility(f.id, !f.visible_to_client);
                          if (!res.ok) toast.error(res.error ?? "Could not change that.");
                          router.refresh();
                        })
                      }
                      className="text-bone-400 hover:text-lime-400"
                    >
                      {f.visible_to_client ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    <button
                      type="button"
                      disabled={pending}
                      title={f.visible_to_staff !== false ? "Hide from staff" : "Show to staff"}
                      onClick={() =>
                        start(async () => {
                          const res = await setProjectFileStaffVisibility(f.id, f.visible_to_staff === false);
                          if (!res.ok) toast.error(res.error ?? "Could not change that.");
                          router.refresh();
                        })
                      }
                      className={f.visible_to_staff !== false ? "text-bone-400 hover:text-lime-400" : "text-amber-400 hover:text-lime-400"}
                    >
                      {f.visible_to_staff !== false ? <UserCheck size={14} /> : <UserX size={14} />}
                    </button>

                    <button
                      type="button"
                      disabled={pending}
                      title="Delete"
                      onClick={() =>
                        start(async () => {
                          const res = await deleteProjectFile(f.id);
                          if (!res.ok) toast.error(res.error ?? "Could not delete that.");
                          else toast.success("Deleted.");
                          router.refresh();
                        })
                      }
                      className="text-bone-400 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-bone-400">
          {canManage ? "No files on this project yet." : "No files shared with you yet."}
        </p>
      )}
    </div>
  );
}
