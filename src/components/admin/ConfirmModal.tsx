"use client";

import { AlertTriangle } from "lucide-react";
import Modal from "@/components/admin/Modal";

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
  children?: React.ReactNode;
}

/**
 * Yes/no confirmation. Sits on the shared `Modal` shell so it inherits the
 * X button, focus trap, Escape handling and viewport-capped scrolling.
 */
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
  children,
}: ConfirmModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      pending={pending}
      title={title}
      size="md"
      footer={
        <>
          <button
            type="button"
            className="btn h-9 px-4 text-sm font-medium"
            onClick={onClose}
            disabled={pending}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn h-9 px-4 text-xs font-semibold ${
              isDanger ? "border-rose-500 bg-rose-600 text-white hover:bg-rose-500" : "btn-primary"
            }`}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Processing…" : confirmText}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              isDanger
                ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}
          >
            <AlertTriangle size={22} />
          </div>
          <p className="pt-1 text-sm leading-relaxed text-bone-200">{description}</p>
        </div>
        {children}
      </div>
    </Modal>
  );
}
