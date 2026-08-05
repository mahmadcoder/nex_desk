/* eslint-disable @next/next/no-img-element */

/**
 * Someone's photo, or their initials.
 *
 * `employees.avatar_url` lives in the `public-assets` bucket, which is public
 * with an unconditional read policy — so the stored URL goes straight into
 * `src` with no signing and nothing to refresh.
 */

const SIZES = {
  sm: { box: "h-8 w-8", text: "text-[11px]" },
  md: { box: "h-11 w-11", text: "text-sm" },
  lg: { box: "h-20 w-20", text: "text-2xl" },
} as const;

/**
 * First letter of the first and last words.
 *
 * The four hand-rolled avatar blocks elsewhere in the app use
 * `name.slice(0, 2)`, which renders "Ali Raza" as **AL** rather than AR.
 */
export function initials(name: string): string {
  const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-ink-600 bg-ink-800 ${s.box} ${className}`}
    >
      {/* An <img> with an empty src requests the current page URL and logs a
          404, so the photo branch is only taken when there is actually one. */}
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className={`font-semibold text-lime-400 ${s.text}`} aria-hidden>
          {initials(name)}
        </span>
      )}
    </span>
  );
}
