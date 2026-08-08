import { money } from "@/lib/utils";
import { humanDuration } from "@/lib/workHours";
import type { SpendBreakdown, BudgetHealth } from "@/lib/projectCost";
import { Wallet, AlertTriangle } from "lucide-react";

/**
 * What this project has cost so far, against what we allowed for it.
 *
 * Money-per-hour is exactly what staff must never see, so this whole panel is
 * rendered only for owner/admin — the same rule the Profitability page follows.
 */
export default function BudgetPanel({
  spend,
  health,
  currency,
}: {
  spend: SpendBreakdown;
  /** Null when no budget has been set — the panel then just reports spend. */
  health: BudgetHealth | null;
  currency: string;
}) {
  const bar =
    health?.tone === "over"
      ? "bg-rose-400"
      : health?.tone === "warn"
        ? "bg-amber-400"
        : "bg-lime-400";

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between border-b border-ink-700 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <Wallet size={16} className="text-lime-400" /> Delivery cost
        </h2>
        <span className="mono-tag text-[10px]">
          {spend.hoursSource === "tracked"
            ? "from the timer"
            : spend.hoursSource === "logged"
              ? "from work logs"
              : "no hours yet"}
        </span>
      </div>

      {health ? (
        <>
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-2xl text-bone-50">{money(health.spent, currency)}</p>
            <p className="text-sm text-bone-400">of {money(health.budget, currency)}</p>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-700">
            <div
              className={`h-full rounded-full ${bar} transition-[width] duration-500`}
              // Capped at 100 so the bar cannot overflow its track, while the
              // number beside it still says 140%.
              style={{ width: `${Math.min(100, health.usedPct)}%` }}
            />
          </div>

          <p
            className={`mt-2 text-xs ${
              health.tone === "over"
                ? "text-rose-300"
                : health.tone === "warn"
                  ? "text-amber-300"
                  : "text-bone-400"
            }`}
          >
            {health.tone === "over" ? (
              <>
                <AlertTriangle size={11} className="mr-1 inline" aria-hidden />
                {health.usedPct}% of budget — {money(Math.abs(health.remaining), currency)} over.
              </>
            ) : (
              <>
                {health.usedPct}% used · {money(health.remaining, currency)} left
              </>
            )}
          </p>
        </>
      ) : (
        <>
          <p className="font-mono text-2xl text-bone-50">{money(spend.total, currency)}</p>
          <p className="mt-1 text-xs text-bone-400">
            No budget set. Add one in Project controls to see whether this is on track before it
            finishes rather than after.
          </p>
        </>
      )}

      {/* Two columns on a phone, not three: a value like PKR 1,250,000 does not
          fit in a third of 390px and wraps mid-number. */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-700 pt-4 text-sm sm:grid-cols-3">
        <div>
          <p className="mono-tag text-[10px]">Hours</p>
          <p className="mt-0.5 text-bone-200">{spend.hours}</p>
        </div>
        <div>
          <p className="mono-tag text-[10px]">Labour</p>
          <p className="mt-0.5 text-bone-200">{money(spend.labour, currency)}</p>
        </div>
        <div>
          <p className="mono-tag text-[10px]">Outlay</p>
          <p className="mt-0.5 text-bone-200">{money(spend.outlay, currency)}</p>
        </div>
      </div>

      {spend.byPerson.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-ink-700 pt-3">
          {spend.byPerson.slice(0, 6).map((p) => (
            <li key={p.name} className="flex justify-between text-xs">
              <span className="min-w-0 truncate text-bone-300">{p.name}</span>
              <span className="shrink-0 text-bone-400">{humanDuration(p.hours * 3600)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-bone-400">
        Labour is estimated at each person&apos;s monthly salary over 26 working days ×{" "}
        8 hours. An honest estimate, not accounting.
      </p>
    </section>
  );
}
