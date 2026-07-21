import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHead({
  title, sub, action,
}: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-bone-400">{sub}</p>}
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
  cancelled: "bg-[#F87171] text-[#4A1B0C]",
  partial: "bg-[#FBBF24] text-[#412402]",
  on_hold: "bg-[#FBBF24] text-[#412402]",
  sent: "bg-ink-600 text-bone-200",
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

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-ink-700/50">
            <tr>
              {head.map((h) => (
                <th key={h} className="mono-tag px-5 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
