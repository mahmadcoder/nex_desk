"use client";
import { useState, ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, Check, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentProofUploadProps {
  onUploadComplete: (url: string) => void;
  initialUrl?: string;
}

export default function PaymentProofUpload({
  onUploadComplete,
  initialUrl = "",
}: PaymentProofUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState(initialUrl);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `payment_slip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `payment-slips/${fileName}`;

      const { data, error } = await supabase.storage
        .from("public-assets")
        .upload(filePath, file, { upsert: true });

      if (error) {
        throw error;
      }

      const { data: publicData } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);

      const url = publicData.publicUrl;
      setProofUrl(url);
      onUploadComplete(url);
      toast.success("Payment slip uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload payment slip. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setProofUrl("");
    onUploadComplete("");
  };

  return (
    <div className="space-y-2">
      <label className="mono-tag mb-1.5 block text-xs text-bone-300">
        Payment Slip / Proof Screenshot
      </label>

      {proofUrl ? (
        <div className="relative flex items-center justify-between rounded-lg border border-lime-500/40 bg-ink-800/80 p-3">
          <div className="flex items-center gap-3 overflow-hidden">
            {proofUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proofUrl}
                alt="Payment proof slip"
                className="h-10 w-10 rounded object-cover border border-ink-600 shrink-0"
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-lime-400 shrink-0" />
            )}
            <div className="truncate text-xs">
              <p className="font-medium text-bone-100 truncate">Payment Slip Attached</p>
              <a
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-lime-400 hover:underline text-[11px]"
              >
                View full image ↗
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="rounded p-1 text-bone-400 hover:bg-ink-700 hover:text-rose-400 transition-colors"
            title="Remove slip"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-ink-600 bg-ink-900/60 p-4 transition-colors hover:border-lime-400 hover:bg-ink-800/60">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="sr-only"
          />
          {uploading ? (
            <div className="flex items-center gap-2 text-xs text-lime-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading slip…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-center">
              <Upload className="h-5 w-5 text-bone-400 mb-1" />
              <span className="text-xs font-medium text-bone-200">
                Upload Payment Slip / Screenshot
              </span>
              <span className="text-[11px] text-bone-500">
                JPG, PNG, WEBP, or PDF (WhatsApp / Bank receipt)
              </span>
            </div>
          )}
        </label>
      )}
    </div>
  );
}
