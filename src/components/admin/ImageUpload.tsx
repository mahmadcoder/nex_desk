"use client";
import { useState, useEffect, ChangeEvent } from "react";
import { Upload, Trash2, Eye, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadPublicAsset } from "@/lib/actions/cms";
import PhotoViewer from "@/components/PhotoViewer";
import ConfirmModal from "@/components/admin/ConfirmModal";

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  /**
   * The defaults here are cover-image defaults — a wide preview and
   * "recommended 1200x630". The hire form used them unchanged, so it asked an
   * admin to upload a banner for a person's face. "circle" is for avatars.
   */
  shape?: "wide" | "circle";
  /** Copy for the confirm dialog, when removing needs saying carefully. */
  removeWarning?: string;
}

export default function ImageUpload({
  label = "Cover Image",
  value = "",
  onChange,
  folder = "covers",
  shape = "wide",
  removeWarning,
}: ImageUploadProps) {
  const isAvatar = shape === "circle";
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(value);
  const [viewing, setViewing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // The parent is the source of truth. Without this, a save that the server
  // rejects leaves the thumbnail showing a photo that was never stored.
  useEffect(() => setImageUrl(value), [value]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image size must be under 8MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await uploadPublicAsset(formData);

      if (res.error || !res.url) {
        throw new Error(res.error || "Image upload failed");
      }

      setImageUrl(res.url);
      onChange(res.url);
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      console.error("Image upload error:", err);
      toast.error(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      // Let the same file be picked again after a failure.
      e.target.value = "";
    }
  };

  const handleRemove = () => {
    setConfirmRemove(false);
    setImageUrl("");
    onChange("");
  };

  const fileInput = (
    <input
      type="file"
      accept="image/*"
      onChange={handleFileChange}
      disabled={uploading}
      className="sr-only"
    />
  );

  return (
    <div className="space-y-1.5">
      <label className="mono-tag text-xs block">{label}</label>

      {imageUrl ? (
        <div className="rounded-lg border border-ink-600 bg-ink-800 p-2.5">
          <div className="flex flex-wrap items-center gap-3">
            {/* The thumbnail is the view trigger — it is what everyone clicks
                first, and it used to do nothing at all. */}
            <button
              type="button"
              onClick={() => setViewing(true)}
              title="View full size"
              className="shrink-0 rounded-full ring-lime-400/40 transition hover:ring-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={isAvatar ? "Your photo" : "Uploaded cover"}
                className={
                  isAvatar
                    ? "h-14 w-14 rounded-full border border-ink-700 object-cover"
                    : "h-16 w-24 rounded border border-ink-700 object-cover"
                }
              />
            </button>

            {/* Change / View / Remove.
                `Change` is a label wrapping a live file input, so replacing a
                photo goes straight to the new one. Previously the input only
                existed in the empty state, so the only way to swap a photo was
                to remove it first — which, since Phase 30, raises a removal
                request to an admin that the person never meant to send. */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <label className="btn btn-sm cursor-pointer gap-1.5">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? "Uploading…" : "Change"}
                {fileInput}
              </label>

              <button
                type="button"
                onClick={() => setViewing(true)}
                className="btn btn-sm gap-1.5"
              >
                <Eye size={13} /> View
              </button>

              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                disabled={uploading}
                className="btn btn-sm gap-1.5 text-bone-300 hover:text-rose-400"
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-ink-600 bg-ink-900/60 p-4 transition-colors hover:border-lime-400 hover:bg-ink-800/60">
          {fileInput}
          {uploading ? (
            <div className="flex items-center gap-2 text-xs text-lime-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading image...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-center">
              <ImageIcon className="h-5 w-5 text-bone-400 mb-1" />
              <span className="text-xs font-medium text-bone-200">
                {isAvatar ? "Upload a photo (PNG, JPG, WEBP)" : "Upload Cover Image (PNG, JPG, WEBP)"}
              </span>
              <span className="text-[11px] text-bone-500">
                {isAvatar
                  ? "A square photo works best — at least 400x400px"
                  : "Recommended 1200x630px for high DPI displays"}
              </span>
            </div>
          )}
        </label>
      )}

      <PhotoViewer src={imageUrl} alt={label} open={viewing} onClose={() => setViewing(false)} />

      {/* One mis-click used to wipe a photo with no undo and no warning. */}
      <ConfirmModal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove this image?"
        confirmText="Remove"
        description={
          removeWarning ??
          "It comes off straight away. You can upload a different one at any time."
        }
        onConfirm={handleRemove}
      />
    </div>
  );
}
