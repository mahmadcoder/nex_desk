import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat, Empty } from "@/components/admin/ui";
import { money, sumByCurrency, moneyMulti } from "@/lib/utils";
import { myPayments } from "@/lib/actions/payroll";
import { FileText, Wallet } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "My Pay" };
export const dynamic = "force-dynamic";

const monthLabel = (iso: string) =>
  new Date(`${String(iso).slice(0, 10)}T00:00:00`)
    .toLocaleDateString("en-GB", { month: "long", year: "numeric" });

/**
 * What someone can see about their own pay.
 *
 * Until now this was nothing at all: the Employees section is closed to staff,
 * `employee_compensation` has no self-read policy, and the staff dashboard
 * deliberately carries no money. So the only way to know whether you had been
 * paid was to check your bank.
 *
 * Payments and the current salary — not the decision history behind raises,
 * which carries the agency's own notes about a person.
 *
 * Scoped inside `myPayments()` to the signed-in employee. No id is accepted
 * from the caller, so there is nothing here to tamper with.
 */
export default async function MyPayPage() {
  const me = await getCurrentStaff();
  if (!me) return null;

  if (!me.employeeId) {
    return (
      <>
        <PageHead title="My Pay" />
        <Empty
          title="No employee record linked to this login"
          body="Pay is recorded against an employee profile. If you should have one, ask an owner or admin to link your account."
        />
      </>
    );
  }

  const db = createAdminClient();

  const [{ data: employee }, payments] = await Promise.all([
    db.from("employees")
      .select("full_name, salary_amount, salary_currency, employment_type, joining_date")
      .eq("id", me.employeeId)
      .maybeSingle(),
    myPayments(),
  ]);

  const thisYear = new Date().getFullYear();
  const paidThisYear = payments.filter(
    (p: any) => new Date(p.paid_on).getFullYear() === thisYear
  );

  const yearTotals = sumByCurrency(
    paidThisYear,
    (p: any) => p.currency,
    (p: any) => Number(p.amount)
  );

  return (
    <>
      <PageHead
        title="My Pay"
        sub="Every salary payment recorded against your account, with its slip."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Monthly salary"
          value={
            employee?.salary_amount
              ? money(Number(employee.salary_amount), employee.salary_currency)
              : "—"
          }
          hint={employee?.employment_type ?? undefined}
        />
        <Stat
          label={`Paid in ${thisYear}`}
          value={moneyMulti(yearTotals, "—")}
          tone="good"
          hint={`${paidThisYear.length} payment${paidThisYear.length === 1 ? "" : "s"}`}
        />
        <Stat
          label="With us since"
          value={
            employee?.joining_date
              ? new Date(employee.joining_date).toLocaleDateString("en-GB", {
                  month: "short", year: "numeric",
                })
              : "—"
          }
        />
      </div>

      <div className="mt-8">
        {!payments.length ? (
          <Empty
            title="No payments recorded yet"
            body="Once a payment is recorded it appears here with its transfer slip, and you are emailed at the same time."
          />
        ) : (
          <ul className="card divide-y divide-ink-600">
            {payments.map((p: any) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm text-bone-100">
                    <Wallet size={14} className="shrink-0 text-lime-400" />
                    {money(Number(p.amount), p.currency)}
                    <span className="text-[11px] text-bone-400">
                      for {monthLabel(p.period_month)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-bone-300">
                    Sent {p.paid_on}
                    {p.method ? ` · ${String(p.method).replace(/_/g, " ")}` : ""}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                  {p.note && (
                    <p className="mt-1 text-xs leading-relaxed text-bone-300">{p.note}</p>
                  )}
                </div>

                {p.slip_url && (
                  <a
                    href={p.slip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm shrink-0 gap-1.5"
                  >
                    <FileText size={13} /> Slip
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-bone-300">
        Payments can take a day or two to appear in your bank after they are sent. If one is
        listed here but has not reached you after that, say so and it will be chased.
      </p>
    </>
  );
}
