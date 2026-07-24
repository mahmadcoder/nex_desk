"use client";
import { useState, ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
}

export default function ImageUpload({
  label = "Cover Image",
  value = "",
  onChange,
  folder = "covers",
}: ImageUploadProps) {
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
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from("public-assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from("public-assets")
        .getPublicUrl(fileName);

      const url = publicData.publicUrl;
      setImageUrl(url);
      onChange(url);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Failed to upload image. Please try again.");
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
              alt="Uploaded cover"
              className="h-16 w-24 rounded object-cover border border-ink-700 shrink-0"
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
                Upload Cover Image (PNG, JPG, WEBP)
              </span>
              <span className="text-[11px] text-bone-500">
                Recommended 1200x630px for high DPI displays
              </span>
            </div>
          )}
        </label>
      )}
    </div>
  );
}
