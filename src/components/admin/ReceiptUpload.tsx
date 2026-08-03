"use client";

import { useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * The receipt for a cost paid on the client's behalf.
 *
 * Goes to the public bucket, like payment slips, because the client opens it
 * straight from an email and from their portal — a signed URL would expire
 * while the email is still in their inbox. The filename is randomised so the
 * URL cannot be guessed from a client or project id.
 */
export default function ReceiptUpload({
  initialUrl = "",
  onUploaded,
}: {
  initialUrl?: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(initialUrl);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    // Cleared straight away so picking the same file twice still fires onChange.
    input.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Receipts must be under 10MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `receipts/receipt_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}.${ext}`;

      const { error } = await supabase.storage
        .from("public-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
      setUrl(data.publicUrl);
      onUploaded(data.publicUrl);
      toast.success("Receipt attached.");
    } catch (err) {
      console.error("Receipt upload failed:", err);
      toast.error("Could not upload that receipt. Try again.");
    } finally {
      setUploading(false);
    }
  }

  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);

  return (
    <div>
      <label className="mono-tag mb-1.5 block text-xs">Receipt (optional)</label>

      {url ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-lime-500/40 bg-ink-800/80 p-3">
          <div className="flex min-w-0 items-center gap-3">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="Receipt"
                className="h-10 w-10 shrink-0 rounded border border-ink-600 object-cover"
              />
            ) : (
              <FileText className="h-6 w-6 shrink-0 text-lime-400" />
            )}
            <div className="min-w-0 text-xs">
              <p className="truncate font-medium text-bone-100">Receipt attached</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-lime-400 hover:underline"
              >
                Open it ↗
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setUrl("");
              onUploaded("");
            }}
            title="Remove receipt"
            className="rounded p-1 text-bone-400 transition-colors hover:bg-ink-700 hover:text-rose-400"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-ink-600 bg-ink-900/60 p-4 transition-colors hover:border-lime-400 hover:bg-ink-800/60">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFile}
            disabled={uploading}
            className="sr-only"
          />
          {uploading ? (
            <span className="flex items-center gap-2 text-xs text-lime-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1 text-center">
              <Upload className="mb-1 h-5 w-5 text-bone-400" />
              <span className="text-xs font-medium text-bone-200">
                Attach the receipt or invoice
              </span>
              <span className="text-[11px] text-bone-500">
                JPG, PNG, WEBP or PDF — the client can open this from their portal
              </span>
            </span>
          )}
        </label>
      )}
    </div>
  );
}
