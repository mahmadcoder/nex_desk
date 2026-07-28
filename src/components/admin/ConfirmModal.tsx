"use client";

import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  isDanger = true,
  pending = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="card w-full max-w-md p-6 bg-ink-900 border-ink-600 shadow-2xl space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-bone-400 hover:text-bone-50 hover:bg-ink-800 transition-colors cursor-pointer"
          title="Close"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div
            className={`h-11 w-11 rounded-xl shrink-0 flex items-center justify-center border ${
              isDanger
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            <AlertTriangle size={22} />
          </div>

          <div className="space-y-1 pt-0.5">
            <h3 className="text-lg font-semibold text-bone-50">{title}</h3>
            <p className="text-xs text-bone-300 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-ink-700/80">
          <button
            type="button"
            className="btn h-9 px-4 text-xs font-medium cursor-pointer"
            onClick={onClose}
            disabled={pending}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn h-9 px-4 text-xs font-semibold cursor-pointer ${
              isDanger
                ? "bg-rose-600 text-white hover:bg-rose-500 border-rose-500"
                : "btn-primary"
            }`}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
