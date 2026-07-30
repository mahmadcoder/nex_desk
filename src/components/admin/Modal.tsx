"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

/**
 * The shared modal shell for the admin panel.
 *
 * Built on Radix Dialog so focus trapping, body-scroll locking and Escape
 * handling are not hand-rolled, and rendered through a portal so a modal
 * opened from inside a table cell is not clipped by it.
 *
 * Layout is a flex column with a fixed header and footer and a scrolling body,
 * capped at the viewport height. That is deliberate: the previous modals
 * centred a full-height card with no overflow handling, so on a short window
 * the action buttons fell off the bottom of the screen with no way to reach
 * them.
 *
 * Clicking the backdrop does NOT close the dialog — closing an in-progress form
 * by mis-clicking loses the entered data. Use the X button, Cancel, or Escape.
 */
export default function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  size = "md",
  pending = false,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Small label above the title, e.g. "Team Assignment". */
  eyebrow?: string;
  description?: string;
  size?: ModalSize;
  /** Blocks closing while a submit is in flight. */
  pending?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:duration-200" />

        <Dialog.Content
          // Mis-clicking the backdrop must not discard a half-filled form.
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (pending) e.preventDefault();
          }}
          className={cn(
            "admin fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
            // dvh, not vh — mobile browser chrome otherwise pushes the footer
            // off-screen.
            "max-h-[calc(100dvh-2rem)] overflow-hidden rounded-xl border border-ink-600 bg-ink-900 text-left shadow-2xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:duration-200",
            SIZES[size]
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-ink-700 p-5 sm:px-6">
            <div className="min-w-0">
              {eyebrow && <span className="mono-tag mb-0.5 block text-xs text-lime-400">{eyebrow}</span>}
              <Dialog.Title className="text-base font-semibold text-bone-50">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-xs leading-relaxed text-bone-300">
                  {description}
                </Dialog.Description>
              )}
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                disabled={pending}
                aria-label="Close"
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-bone-400 transition-colors hover:bg-ink-800 hover:text-bone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* The only scroll container, so there is never a double scrollbar. */}
          <div className="nd-scroll min-h-0 flex-1 overflow-y-auto p-5 sm:px-6">{children}</div>

          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-ink-700 p-4 sm:px-6">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
