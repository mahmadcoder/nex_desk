"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { uploadClientSignedDocument } from "@/lib/actions/cms";
import { UploadCloud, FileCheck, Loader2 } from "lucide-react";

interface ClientDocumentUploaderProps {
  clientId: string;
}

export default function ClientDocumentUploader({ clientId }: ClientDocumentUploaderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [docTitle, setDocTitle] = useState("Signed Agreement");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    // Clear immediately so picking the same file twice still fires onChange.
    input.value = "";
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be under 15MB.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Uploading signed document to secure storage...");

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      // Scoped per client: the storage RLS policy authorises on this folder,
      // and a flat prefix let one client overwrite another's upload.
      const filePath = `signed-agreements/${clientId}/signed_${Date.now()}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (storageError) throw storageError;

      startTransition(async () => {
        try {
          await uploadClientSignedDocument({
            clientId,
            title: docTitle.trim() || file.name,
            storagePath: filePath,
            documentType: "signed_agreement",
          });

          toast.success("Signed document uploaded successfully! Admin team notified.", { id: toastId });
          setDocTitle("Signed Agreement");
          router.refresh();
        } catch (err: any) {
          toast.error(err.message || "Failed to record document.", { id: toastId });
        } finally {
          setUploading(false);
        }
      });
    } catch (err: any) {
      toast.error(err.message || "File upload failed.", { id: toastId });
      setUploading(false);
    }
  };

  return (
    <div className="card p-5 border-ink-600 bg-ink-900/60 space-y-4">
      <div className="flex items-center justify-between border-b border-ink-700/80 pb-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-lime-400 shrink-0" />
          <h3 className="text-sm font-semibold text-bone-50">Upload Signed Agreement / Contract</h3>
        </div>
        <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/20">
          Client Action Required
        </span>
      </div>

      <p className="text-xs text-bone-300 leading-relaxed">
        Please upload your signed proposal, contract, or NDA (PDF or image). Once uploaded, your project manager will verify and activate your milestones.
      </p>

      <div className="space-y-3 pt-1">
        <div>
          <label className="mono-tag text-[11px] text-bone-400 mb-1 block">Document Title</label>
          <input
            className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
            placeholder="e.g. Master Service Agreement - Signed"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            disabled={uploading || pending}
          />
        </div>

        <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          uploading || pending
            ? "border-ink-600 bg-ink-950/40 opacity-60 cursor-not-allowed"
            : "border-ink-600 hover:border-lime-400/60 bg-ink-950/50 hover:bg-ink-800/60"
        }`}>
          <div className="flex flex-col items-center text-center space-y-2">
            {uploading || pending ? (
              <Loader2 className="h-7 w-7 text-lime-400 animate-spin" />
            ) : (
              <UploadCloud className="h-7 w-7 text-lime-400" />
            )}
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-bone-100">
                {uploading || pending ? "Uploading & Saving..." : "Click to upload signed document"}
              </p>
              <p className="text-[10px] text-bone-400">PDF, PNG, JPG or DOCX (Max 15MB)</p>
            </div>
          </div>

          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading || pending}
          />
        </label>
      </div>
    </div>
  );
}
