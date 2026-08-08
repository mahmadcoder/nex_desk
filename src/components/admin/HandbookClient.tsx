"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/admin/Modal";
import { addInternalDoc, deleteInternalDoc } from "@/lib/actions/internalDocs";
import { DOC_CATEGORIES } from "@/config/docCategories";
import CustomSelect from "@/components/ui/CustomSelect";
import { Plus, Upload, Link2, Trash2, Loader2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BUCKET = "staff-docs";
const MAX_MB = 25;
const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none";

/**
 * Adding to the handbook.
 *
 * A file OR a link, deliberately. Brand guidelines usually live in Figma and
 * hosting notes in a wiki — forcing a re-upload guarantees the copy here goes
 * stale within a month, and a stale SOP is worse than no SOP.
 */
export default function HandbookClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [f, setF] = useState({ title: "", description: "", category: "sop", linkUrl: "" });
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setF({ title: "", description: "", category: "sop", linkUrl: "" });
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const save = () =>
    start(async () => {
      let storagePath: string | null = null;

      if (file) {
        if (file.size > MAX_MB * 1024 * 1024) {
          toast.error(`That file is over ${MAX_MB}MB. Link to it instead.`);
          return;
        }
        setUploading(true);
        try {
          // Category prefix keeps the bucket browsable, and a timestamp stops
          // two people uploading "handbook.pdf" from overwriting each other.
          const path = `${f.category}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
          const { error } = await createClient().storage.from(BUCKET).upload(path, file);
          if (error) throw error;
          storagePath = path;
        } catch (e: any) {
          toast.error(e?.message || "Upload failed.");
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const res = await addInternalDoc({
        title: f.title,
        description: f.description,
        category: f.category,
        storagePath,
        linkUrl: f.linkUrl,
        mimeType: file?.type || null,
        fileSize: file?.size ?? null,
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Added to the handbook.");
      setOpen(false);
      reset();
      router.refresh();
    });

  return (
    <>
      <button className="btn btn-primary gap-2" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending || uploading}
        size="lg"
        title="Add to the handbook"
        description="Everyone on the team can read this. Nothing here is ever visible to a client."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending || uploading}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={pending || uploading || !f.title.trim() || (!file && !f.linkUrl.trim())}
            >
              {uploading ? "Uploading…" : pending ? "Saving…" : "Add"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block">Title</label>
            <input
              className={field}
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              placeholder="How we run a project kickoff"
            />
          </div>

          <CustomSelect
            label="Category"
            value={f.category}
            onChange={(v) => setF({ ...f, category: v })}
            options={DOC_CATEGORIES.map(([value, label]) => ({ value, label }))}
          />

          <div>
            <label className="mono-tag mb-1.5 block">What is it for</label>
            <textarea
              className={`${field} min-h-[70px] resize-y`}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              placeholder="One line so somebody knows whether to open it."
            />
          </div>

          <div className="rounded-lg border border-ink-600 bg-ink-800/50 p-3.5">
            <p className="mono-tag mb-2.5 text-[10px]">A file, or a link — either is fine</p>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn btn-sm gap-1.5"
                disabled={!!f.linkUrl.trim()}
              >
                <Upload size={13} /> {file ? "Change file" : "Choose file"}
              </button>
              {file && <span className="min-w-0 truncate text-xs text-bone-300">{file.name}</span>}
              <span className="mono-tag ml-auto text-[10px] text-bone-500">max {MAX_MB}MB</span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Link2 size={13} className="shrink-0 text-bone-400" aria-hidden />
              <input
                className={field}
                value={f.linkUrl}
                onChange={(e) => setF({ ...f, linkUrl: e.target.value })}
                placeholder="https://figma.com/… — for anything that lives elsewhere"
                disabled={!!file}
              />
            </div>
            <p className="mt-2 text-[11px] text-bone-400">
              Link to it when the real version lives somewhere else. A re-uploaded copy goes
              stale, and a stale SOP is worse than none.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Remove. Owner/admin only, guarded again in the action. */
export function DeleteDocButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${title}`}
        className="shrink-0 rounded p-1.5 text-bone-500 hover:bg-ink-800 hover:text-rose-400"
      >
        <Trash2 size={14} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        title="Delete this?"
        description={`"${title}" will be removed for everyone, and the file with it.`}
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
                  const res = await deleteInternalDoc(id);
                  if (!res.ok) toast.error(res.error);
                  else toast.success("Deleted.");
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Deleting…
                </span>
              ) : (
                "Delete"
              )}
            </button>
          </>
        }
      >
        <p className="text-sm text-bone-300">This cannot be undone.</p>
      </Modal>
    </>
  );
}
