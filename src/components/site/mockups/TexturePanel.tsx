import { cn } from "@/lib/utils";

/**
 * Shows a real photo as a section/card backdrop, on-brand and legible.
 *
 * Previous version darkened the image almost to black. This one keeps the
 * photo clearly visible: a light uniform ink tint for brand cohesion, plus a
 * gradient anchored to the bottom only where text usually sits. The `overlay`
 * prop still works but is capped so an image can never disappear again.
 */
export default function TexturePanel({
  src,
  className,
  overlay = 0.35,
  grid = true,
  children,
}: {
  src: string;
  className?: string;
  overlay?: number;
  grid?: boolean;
  children?: React.ReactNode;
}) {
  const tint = Math.min(overlay, 0.45); // never fully hide the photo

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* the photo — full opacity so it actually reads */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />

      {/* light uniform ink tint keeps it in the palette */}
      <div className="absolute inset-0" style={{ background: `rgba(11,11,15,${tint})` }} />

      {/* bottom-anchored gradient for text legibility only */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(11,11,15,0.9) 0%, rgba(11,11,15,0.15) 45%, transparent 75%)" }}
      />

      {/* faint desk grid */}
      {grid && (
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(244,241,234,0.08) 0.5px, transparent 0.5px), linear-gradient(to bottom, rgba(244,241,234,0.08) 0.5px, transparent 0.5px)",
            backgroundSize: "44px 44px",
          }}
        />
      )}

      <div className="relative">{children}</div>
    </div>
  );
}
