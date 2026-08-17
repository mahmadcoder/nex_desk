import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { PageHead } from "@/components/admin/ui";
import PayrollRunClient from "@/components/admin/PayrollRunClient";
import { proRataSalary } from "@/lib/payroll";
import { fmtMonth } from "@/lib/datetime";
import { getTeamOvertimeSummary } from "@/lib/actions/attendance";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Payroll run" };
export const dynamic = "force-dynamic";

const firstOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

/**
 * Paying everybody for one month.
 *
 * Until now each person was paid individually from their profile, which for a
 * team of eleven is eleven trips through the same form — and the eleventh is
 * where somebody gets missed.
 *
 * The suggested figure is pro-rated by `proRataSalary`, the same function the
 * single-payment form uses, so a person who joined mid-month is not offered a
 * full salary here and a partial one there.
 */
export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const { month } = await searchParams;
  const anchor = month ? new Date(`${month}-01T00:00:00`) : new Date();
  const periodMonth = firstOf(anchor);

  const [{ data: employees }, { data: paid }, { data: departments }, overtimeList] = await Promise.all([
    db
      .from("employees")
      .select(
        "id, full_name, avatar_url, job_title, salary_amount, salary_currency, joining_date, leaving_date, department_id"
      )
      .ilike("status", "active")
      .order("full_name"),
    db
      .from("salary_payments")
      .select("employee_id, amount, currency")
      .eq("period_month", periodMonth),
    db.from("departments").select("id, name"),
    getTeamOvertimeSummary(periodMonth),
  ]);

  const paidBy = new Map((paid ?? []).map((p: any) => [p.employee_id, p]));
  const deptName = new Map((departments ?? []).map((d: any) => [d.id, d.name]));
  const overtimeByEmp = new Map((overtimeList ?? []).map((o: any) => [o.employee.id, o.summary]));

  const rows = (employees ?? []).map((e: any) => {
    const already = paidBy.get(e.id);
    const otSummary = overtimeByEmp.get(e.id);
    const overtimePay = otSummary?.overtimePay ?? 0;
    const pro = proRataSalary({
      salary: Number(e.salary_amount || 0),
      periodMonth,
      joiningDate: e.joining_date,
      leavingDate: e.leaving_date,
    });

    const suggestedTotal = Math.round((pro.amount + overtimePay) * 100) / 100;

    return {
      id: e.id,
      full_name: e.full_name,
      avatar_url: e.avatar_url,
      job_title: e.job_title,
      salary_amount: e.salary_amount,
      baseSalary: pro.amount,
      overtimePay,
      overtimeHours: otSummary?.netOvertimeSec ? Math.round((otSummary.netOvertimeSec / 3600) * 10) / 10 : 0,
      deficitRecoveredHours: otSummary?.recoveredDeficitSec ? Math.round((otSummary.recoveredDeficitSec / 3600) * 10) / 10 : 0,
      currency: String(e.salary_currency || "USD").toUpperCase(),
      departmentName: e.department_id ? deptName.get(e.department_id) ?? null : null,
      suggested: suggestedTotal,
      proRataReason: pro.isPartial ? pro.reason : null,
      alreadyPaid: !!already,
      paidAmount: already?.amount ?? 0,
    };
  });

  const outstanding = rows.filter((r) => !r.alreadyPaid && Number(r.suggested) > 0).length;
  const prev = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const next = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  const param = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <PageHead
        title="Payroll run"
        sub={
          outstanding
            ? `${outstanding} still to pay for ${fmtMonth(anchor)}.`
            : `Everyone is paid for ${fmtMonth(anchor)}.`
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Link href={`?month=${param(prev)}`} className="mono-tag hover:text-lime-400">
          ← prev
        </Link>
        <span className="text-sm text-bone-200">{fmtMonth(anchor)}</span>
        <Link href={`?month=${param(next)}`} className="mono-tag hover:text-lime-400">
          next →
        </Link>
      </div>

      <PayrollRunClient rows={rows} periodMonth={periodMonth} />
    </>
  );
}
