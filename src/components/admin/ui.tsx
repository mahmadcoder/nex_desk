import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHead({
  title, sub, action,
}: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl tracking-tight">{title}</h1>
        {sub && <p className="mt-1.5 text-sm leading-relaxed text-bone-300">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label, value, hint, tone = "default",
}: { label: string; value: string; hint?: string; tone?: "default" | "good" | "warn" }) {
  return (
    <div className="card p-5">
      <p className="mono-tag">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl tracking-tight",
          tone === "good" && "text-lime-400",
          tone === "warn" && "text-[color:var(--color-warn)]"
        )}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-bone-400">{hint}</p>}
    </div>
  );
}

const TONES: Record<string, string> = {
  new: "bg-lime-400 text-lime-950",
  won: "bg-lime-400 text-lime-950",
  locked: "bg-lime-400 text-lime-950",
  paid: "bg-lime-400 text-lime-950",
  completed: "bg-lime-400 text-lime-950",
  delivered: "bg-lime-400 text-lime-950",
  overdue: "bg-[#F87171] text-[#4A1B0C]",
  lost: "bg-[#F87171] text-[#4A1B0C]",
  // Not an alarm — spam is dismissed, not urgent.
  spam: "bg-ink-700 text-bone-400 line-through",
  cancelled: "bg-[#F87171] text-[#4A1B0C]",
  partial: "bg-[#FBBF24] text-[#412402]",
  on_hold: "bg-[#FBBF24] text-[#412402]",
  sent: "bg-ink-600 text-bone-200",
  // A draft invoice is a scheduled stage, not money owed yet — outlined so it
  // reads as provisional rather than as another filled status pill.
  draft: "border border-dashed border-ink-400 text-bone-300",
};

export function Badge({ children }: { children: string }) {
  const key = String(children).toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide",
        TONES[key] ?? "bg-ink-700 text-bone-200"
      )}
    >
      {String(children).replace(/_/g, " ")}
    </span>
  );
}

export function Empty({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="card p-16 text-center">
      <h2 className="text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-bone-400">{body}</p>
      {href && cta && <Link href={href} className="btn btn-primary mt-6">{cta}</Link>}
    </div>
  );
}

/**
 * The one table in the app, and on a phone it stops being a table.
 *
 * `min-w-[560px]` used to apply at every width. Seven columns at `px-5` is
 * 280px of padding before a single character, so on a 390px screen the last
 * column — always the actions — sat several hundred pixels off-screen, behind a
 * scrollbar that mobile browsers hide at rest. It was unreachable rather than
 * merely awkward.
 *
 * Below `sm` each row becomes a card and each cell gets its column heading
 * printed beside it. The headings are passed down as CSS custom properties
 * rather than as `data-label` on every cell, because that would have meant
 * editing sixteen pages and several hundred `<td>`s — every consumer's cell
 * order already matches `head` exactly, so `nth-child` is enough. The rules
 * live in `globals.css` under `.nd-table`.
 */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  const labels = Object.fromEntries(
    head.map((h, i) => [`--c${i + 1}`, JSON.stringify(h)])
  ) as React.CSSProperties;

  // Only some tables end in an actions column, marked by an empty heading.
  // The other eight end on real data ("Status", "When", "Deadline"), which
  // must keep its label rather than be turned into a button bar.
  const actionsLast = head.length > 0 && head[head.length - 1].trim() === "";

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className={`nd-table w-full text-left text-sm sm:min-w-[560px] ${actionsLast ? "nd-actions-last" : ""}`}
          style={labels}
        >
          <thead className="bg-ink-700/50">
            <tr>
              {head.map((h, i) => (
                <th key={h || `col-${i}`} className="mono-tag px-5 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
