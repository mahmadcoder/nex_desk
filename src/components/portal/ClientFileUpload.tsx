"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { clientUploadProjectFile } from "@/lib/actions/projectFiles";
import { CONTACT_WHATSAPP, whatsappLink } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  Upload,
  Paperclip,
  CheckCircle2,
  FileText,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BUCKET = "project-files";
const MAX_MB = 25;

const KINDS = [
  ["assets", "Project Assets & Media"],
  ["design", "Brand Assets / UI Design"],
  ["nda", "Documents / PDFs / NDA"],
  ["source", "Code / Data Archive"],
  ["other", "General Resources"],
] as const;

export default function ClientFileUpload({
  projectId,
  projectName,
  agencyWhatsapp = CONTACT_WHATSAPP,
}: {
  projectId: string;
  projectName: string;
  agencyWhatsapp?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState<string>("assets");
  const [description, setDescription] = useState("");
  const [lastUploaded, setLastUploaded] = useState<{
    name: string;
    whatsappUrl: string;
  } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File is over ${MAX_MB}MB. Please share a cloud link or message us on WhatsApp.`);
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}…`);

    try {
      const path = `${projectId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: storageError } = await createClient()
        .storage.from(BUCKET)
        .upload(path, file);

      if (storageError) throw storageError;

      const res = await clientUploadProjectFile({
        projectId,
        name: file.name,
        storagePath: path,
        mimeType: file.type || null,
        fileSize: file.size,
        description: description.trim() || null,
        kind,
      });

      if (!res.ok) throw new Error(res.error);

      // Pre-filled WhatsApp notification message for the client
      const waMsg = `Hi NexDesk Team, I just uploaded "${file.name}" to the client portal for project "${projectName}". Please review it!`;
      const waUrl = whatsappLink(agencyWhatsapp, waMsg);

      setLastUploaded({
        name: file.name,
        whatsappUrl: waUrl,
      });

      toast.success("Uploaded successfully!", { id: toastId });
      setDescription("");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed. Please try again.", { id: toastId });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const generalWaMsg = `Hi NexDesk Team, I would like to share some project assets for "${projectName}".`;
  const generalWaUrl = whatsappLink(agencyWhatsapp, generalWaMsg);

  return (
    <div className="space-y-4">
      {/* WhatsApp Assistance Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-ink-900 to-ink-900/60 p-4 text-xs">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-[#25D366]/15 text-[#25D366] shrink-0 border border-[#25D366]/30">
            <MessageSquare size={16} />
          </div>
          <div>
            <p className="font-semibold text-bone-100 text-sm">Need to send files directly or quickly?</p>
            <p className="text-bone-300 mt-0.5 leading-relaxed">
              You can upload required files, brand assets, or PDFs here. If you prefer or in case of portal inactivity, you can also send files directly to our team via WhatsApp.
            </p>
          </div>
        </div>
        <a
          href={generalWaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mono-tag inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-2 text-[11px] font-semibold text-[#25D366] hover:bg-[#25D366]/20 transition-colors shrink-0"
        >
          Send via WhatsApp <ExternalLink size={12} />
        </a>
      </div>

      {/* Upload Box Card */}
      <div className="card p-5 border-ink-600 bg-ink-900/60 space-y-4">
        <div className="flex items-center justify-between border-b border-ink-700/60 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-bone-50 flex items-center gap-2">
              <Upload size={15} className="text-lime-400" /> Upload Project Assets & Files
            </h3>
            <p className="text-xs text-bone-400 mt-0.5">
              Upload logos, design assets, copy docs, PDFs, or credentials needed for your project.
            </p>
          </div>
          <span className="mono-tag text-[10px] text-bone-500">Max {MAX_MB}MB</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mono-tag block text-[11px] text-bone-300 mb-1">Asset Category</label>
            <CustomSelect
              value={kind}
              onChange={(val) => setKind(val)}
              options={KINDS.map(([id, label]) => ({ value: id, label }))}
            />
          </div>

          <div>
            <label className="mono-tag block text-[11px] text-bone-300 mb-1">Optional Note / Instructions</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Brand logo vector files, high-res assets..."
              className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-1">
          <input
            ref={inputRef}
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            id="client-file-upload-input"
          />
          <label
            htmlFor="client-file-upload-input"
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-500 bg-ink-800/40 p-6 text-center transition-all cursor-pointer ${
              uploading ? "opacity-60 pointer-events-none" : "hover:border-lime-400 hover:bg-ink-800/80"
            }`}
          >
            <Upload size={24} className="text-lime-400 mb-2 opacity-80" />
            <p className="text-xs font-semibold text-bone-100">
              {uploading ? "Uploading file, please wait..." : "Click to select a file or drag & drop"}
            </p>
            <p className="text-[11px] text-bone-400 mt-1">
              Supports Images (PNG, JPG, SVG), PDFs, DOCX, ZIP archives up to {MAX_MB}MB
            </p>
          </label>
        </div>

        {/* Post-Upload Success & Quick WhatsApp Ping Confirmation */}
        {lastUploaded && (
          <div className="rounded-xl border border-lime-400/40 bg-lime-400/10 p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-xs text-lime-300 font-semibold">
              <CheckCircle2 size={16} className="text-lime-400 shrink-0" />
              <span>&ldquo;{lastUploaded.name}&rdquo; uploaded successfully! Our team has been notified.</span>
            </div>
            <p className="text-xs text-bone-300 leading-relaxed">
              💡 <strong>Quick WhatsApp Alert (Recommended):</strong> If you want our team to check it immediately in case of dashboard inactivity, send a 1-tap WhatsApp alert:
            </p>
            <div className="pt-1">
              <a
                href={lastUploaded.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm inline-flex items-center gap-2 bg-[#25D366] text-black font-semibold hover:bg-[#20bd5a]"
              >
                <MessageSquare size={14} /> Send WhatsApp Ping Now <ArrowRight size={13} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
