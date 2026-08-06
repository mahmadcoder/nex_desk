import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Empty } from "@/components/admin/ui";
import { Wallet, CalendarDays, Clock, Users } from "lucide-react";
import MyPhoto from "@/components/admin/MyPhoto";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

/**
 * What the app knows about the person signed in.
 *
 * Everything here already existed in `employees` — an admin could see it on
 * `/employees/[id]`, and a client could see the photo in the portal, but the
 * person themselves had no route to any of it: `employees` is not in
 * `STAFF_ALLOWED_SEGMENTS`.
 *
 * Read-only apart from the photo. Salary deliberately lives on `/my-pay`,
 * which already presents it properly alongside the payment history.
 */
export default async function MyProfilePage() {
  const me = await getCurrentStaff();
  if (!me) return null;

  if (!me.employeeId) {
    return (
      <>
        <PageHead title="My Profile" />
        <Empty
          title="No employee record linked to this login"
          body="Your profile is stored against an employee record. If you should have one, ask an owner or admin to link your account."
        />
      </>
    );
  }

  const db = createAdminClient();

  const [{ data: employee }, { data: assignments }] = await Promise.all([
    db
      .from("employees")
      .select("id, full_name, email, job_title, seniority, employment_type, joining_date, skills, avatar_url, status, avatar_removal_requested_at")
      .eq("id", me.employeeId)
      .maybeSingle(),
    db
      .from("client_employee_assignments")
      .select("clients(id, name, company)")
      .eq("employee_id", me.employeeId),
  ]);

  const clients = (assignments ?? []).map((a: any) => a.clients).filter(Boolean);
  const skills: string[] = Array.isArray(employee?.skills) ? employee!.skills : [];

  const facts: Array<[string, string]> = [
    ["Role", employee?.job_title || "—"],
    ["Seniority", employee?.seniority || "—"],
    ["Employment", String(employee?.employment_type || "—").replace(/_/g, " ")],
    [
      "With us since",
      employee?.joining_date
        ? new Date(employee.joining_date).toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
          })
        : "—",
    ],
  ];

  return (
    <>
      <PageHead title="My Profile" sub="How you appear to the team and to clients." />

      {/* Single column on a phone, side by side from sm. */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="card p-5 sm:p-6">
          <MyPhoto
            name={employee?.full_name || me.fullName}
            currentUrl={employee?.avatar_url ?? null}
            removalPending={!!employee?.avatar_removal_requested_at}
          />
          <div className="mt-5 border-t border-ink-700 pt-4 text-center">
            <p className="truncate text-base font-semibold text-bone-50">
              {employee?.full_name || me.fullName}
            </p>
            <p className="mono-tag mt-1 text-[11px] capitalize text-lime-400/80">{me.role}</p>
            <p className="mt-1 truncate text-xs text-bone-300">{employee?.email}</p>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-base font-semibold text-bone-50">Your details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="mono-tag text-[11px]">{label}</dt>
                  <dd className="mt-0.5 text-sm text-bone-100 capitalize">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 border-t border-ink-700 pt-4">
              <p className="mono-tag mb-2 text-[11px]">Skills</p>
              {skills.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="mono-tag rounded-full border border-ink-600 bg-ink-800 px-2.5 py-1 text-[11px] text-bone-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-bone-300">
                  None recorded yet. Ask an admin to add them — they are what clients see beside
                  your name in their portal.
                </p>
              )}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-bone-50">
              <Users size={15} className="text-lime-400" /> Who you work with
            </h2>
            {clients.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {clients.map((c: any) => (
                  <li key={c.id}>
                    <Link
                      href={`${BASE}/clients/${c.id}`}
                      className="inline-flex rounded-full border border-ink-600 bg-ink-800 px-3 py-1.5 text-xs text-bone-100 hover:border-lime-400/40 hover:text-lime-400"
                    >
                      {c.company || c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-bone-300">
                You are not assigned to any clients yet.
              </p>
            )}
          </section>

          {/* The three things a staff member actually comes here to do next. */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [`${BASE}/my-pay`, Wallet, "My Pay", "Salary and slips"],
              [`${BASE}/leave`, CalendarDays, "My Leave", "Requests and days off"],
              [`${BASE}/daily-logs`, Clock, "Work Logs", "Log today's work"],
            ].map(([href, Icon, title, sub]: any) => (
              <Link
                key={href}
                href={href}
                className="card flex items-center gap-3 p-4 transition-colors hover:border-lime-400/30"
              >
                <Icon size={16} className="shrink-0 text-lime-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-bone-50">{title}</span>
                  <span className="block truncate text-[11px] text-bone-300">{sub}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
