"use client";
import { useState, ChangeEvent } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadPublicAsset } from "@/lib/actions/cms";

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
}

export default function ImageUpload({
  label = "Cover Image",
  value = "",
  onChange,
  folder = "covers",
  shape = "wide",
}: ImageUploadProps) {
  const isAvatar = shape === "circle";
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(value);

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
    }
  };

  const handleRemove = () => {
    setImageUrl("");
    onChange("");
  };

  return (
    <div className="space-y-1.5">
      <label className="mono-tag text-xs block">{label}</label>

      {imageUrl ? (
        <div className="relative group overflow-hidden rounded-lg border border-ink-600 bg-ink-800 p-2">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={isAvatar ? "Your photo" : "Uploaded cover"}
              className={
                isAvatar
                  ? "h-14 w-14 rounded-full object-cover border border-ink-700 shrink-0"
                  : "h-16 w-24 rounded object-cover border border-ink-700 shrink-0"
              }
            />
            <div className="flex-1 truncate text-xs">
              <p className="font-medium text-bone-100 truncate">{imageUrl.split("/").pop()}</p>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-lime-400 hover:underline text-[11px]"
              >
                View full image ↗
              </a>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded p-1.5 text-bone-400 hover:bg-ink-700 hover:text-rose-400 transition-colors"
              title="Remove image"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-ink-600 bg-ink-900/60 p-4 transition-colors hover:border-lime-400 hover:bg-ink-800/60">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="sr-only"
          />
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
    </div>
  );
}
