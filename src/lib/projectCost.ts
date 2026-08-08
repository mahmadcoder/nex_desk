/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * What a project costs us to deliver.
 *
 * Extracted from `nx-control/profit/page.tsx`, which defined it inline. The
 * budget panel needs the same figure, and two implementations of "what does
 * this cost" would disagree the first time either changed — with one screen
 * saying a project is profitable while the other says it is not.
 */

/**
 * A monthly salary spread over 26 working days (Mon–Sat) at 8 hours.
 *
 * A rough divisor on purpose. It is stable across months, which matters more
 * here than precision: a rate that moved with the calendar would make the same
 * hour cost different amounts in February and March, and nobody could reconcile
 * the totals.
 */
export const HOURS_PER_MONTH = 26 * 8;

export type Rate = { name: string; hourly: number; currency: string };

export function hourlyRates(
  employees: { id: string; full_name: string; salary_amount?: number | null; salary_currency?: string | null }[]
): Map<string, Rate> {
  return new Map(
    employees.map((e) => [
      e.id,
      {
        name: e.full_name,
        hourly: Number(e.salary_amount || 0) / HOURS_PER_MONTH,
        currency: e.salary_currency || "USD",
      },
    ])
  );
}

export type SpendBreakdown = {
  /** Hours counted, whichever source they came from. */
  hours: number;
  /** Labour cost in the project's currency. */
  labour: number;
  /** Real money out: domains, licences, ad spend. */
  outlay: number;
  total: number;
  /** Which hours source was used, so the UI can say so. */
  hoursSource: "tracked" | "logged" | "none";
  /** Hours per person, for the breakdown. */
  byPerson: { name: string; hours: number }[];
};

/**
 * Spend on one project.
 *
 * **Tracked timer hours win over self-reported log hours** when any exist. The
 * timer is the more accurate of the two, and mixing them would double-count a
 * day that has both — which is most days now that the log is pre-filled from
 * the timer.
 *
 * `convert` is injected rather than imported so this stays a pure function and
 * the caller keeps control of the FX table it already loaded.
 */
export function projectSpend(input: {
  currency: string;
  rates: Map<string, Rate>;
  /** `time_entries` rows for this project. */
  tracked?: { employee_id: string; duration_sec?: number | null }[];
  /** `daily_work_logs` rows for this project. */
  logged?: { employee_id?: string | null; hours_spent?: number | null }[];
  /** `project_expenses` rows for this project. */
  expenses?: { cost?: number | null; currency?: string | null }[];
  convert: (amount: number, from: string, to: string) => number;
}): SpendBreakdown {
  const { currency, rates, convert } = input;
  const tracked = input.tracked ?? [];
  const logged = input.logged ?? [];

  const useTracked = tracked.length > 0;
  const who = new Map<string, number>();
  let hours = 0;
  let labour = 0;

  const charge = (employeeId: string | null | undefined, h: number) => {
    if (h <= 0) return;
    hours += h;
    const r = employeeId ? rates.get(employeeId) : null;
    if (!r) return;
    if (r.hourly > 0) labour += convert(h * r.hourly, r.currency, currency);
    who.set(r.name, (who.get(r.name) ?? 0) + h);
  };

  if (useTracked) {
    for (const t of tracked) charge(t.employee_id, Number(t.duration_sec ?? 0) / 3600);
  } else {
    for (const l of logged) charge(l.employee_id, Number(l.hours_spent ?? 0));
  }

  const outlay = (input.expenses ?? []).reduce(
    (s, x) => s + convert(Number(x.cost ?? 0), x.currency || currency, currency),
    0
  );

  return {
    hours: Math.round(hours * 10) / 10,
    labour,
    outlay,
    total: labour + outlay,
    hoursSource: useTracked ? "tracked" : logged.length ? "logged" : "none",
    byPerson: [...who.entries()]
      .map(([name, h]) => ({ name, hours: Math.round(h * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours),
  };
}

export type BudgetHealth = {
  budget: number;
  spent: number;
  /** 0–100+, uncapped: 140% is the number worth seeing. */
  usedPct: number;
  remaining: number;
  tone: "good" | "warn" | "over";
};

/**
 * How the budget is holding up.
 *
 * Deliberately compared against SPEND rather than progress. A project at 40% of
 * its budget and 90% delivered is fine; the same budget at 40% delivered is
 * not — and only the person looking at both can tell, so this reports the
 * number rather than pretending to judge.
 */
export function budgetHealth(budget: number, spent: number): BudgetHealth | null {
  if (!budget || budget <= 0) return null;

  const usedPct = Math.round((spent / budget) * 100);
  return {
    budget,
    spent,
    usedPct,
    remaining: budget - spent,
    tone: usedPct >= 100 ? "over" : usedPct >= 80 ? "warn" : "good",
  };
}
