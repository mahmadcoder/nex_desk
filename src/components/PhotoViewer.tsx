"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";

/**
 * A photo, full size.
 *
 * Purpose-built rather than reusing `Modal`: that one forces a titled header,
 * caps at max-w-2xl and deliberately suppresses click-outside
 * (`Modal.tsx:67`) — all three are wrong for a lightbox, where the expected
 * behaviour is a bare image you dismiss by clicking anywhere.
 *
 * Before this, the only way to see a photo at full size anywhere in the app was
 * a text link that navigated away to the raw storage URL.
 */
export default function PhotoViewer({
  src,
  alt = "",
  open,
  onClose,
}: {
  src: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  // Was locking <body>, which is not the element that scrolls a document.
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !src) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink-950/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Photo"}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-lg p-2 text-bone-300 hover:bg-ink-800 hover:text-bone-50"
      >
        <X size={20} />
      </button>

      {/* Stop the image itself from dismissing — clicking the photo you came to
          look at should not close it. The backdrop still does. */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] max-w-full rounded-xl border border-ink-600 object-contain shadow-2xl"
      />

      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mono-tag absolute bottom-5 inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/90 px-3 py-1.5 text-[11px] text-bone-300 hover:text-lime-400"
      >
        <ExternalLink size={12} /> Open original
      </a>
    </div>,
    document.body
  );
}
