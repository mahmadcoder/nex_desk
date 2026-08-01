import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { leaveBalances } from "@/lib/actions/staff";
import LeaveClient from "@/components/admin/LeaveClient";

export const metadata = { title: "Leave" };
export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const me = await getCurrentStaff();
  if (!me) return null;

  const canManage = me.isPrivileged;
  const db = createAdminClient();

  // A staff member sees only their own requests. The employee id comes from the
  // session, never from the page, so there is nothing to tamper with.
  const [{ data: leaveTypes }, { data: myRequests }] = await Promise.all([
    db.from("leave_types").select("*").order("sort_order"),
    me.employeeId
      ? db.from("leave_requests")
          .select("*, employees(full_name)")
          .eq("employee_id", me.employeeId)
          .order("start_date", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const balances = me.employeeId ? await leaveBalances(me.employeeId) : [];

  // The whole-team views are owner/admin only.
  const [{ data: pendingQueue }, { data: allRequests }, { data: employees }] = canManage
    ? await Promise.all([
        db.from("leave_requests")
          .select("*, employees(full_name, email)")
          .eq("status", "pending")
          .order("start_date"),
        db.from("leave_requests")
          .select("*, employees(full_name)")
          .order("start_date", { ascending: false })
          .limit(60),
        db.from("employees").select("id, full_name").ilike("status", "active").order("full_name"),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }];

  return (
    <LeaveClient
      canManage={canManage}
      balances={balances}
      myRequests={myRequests ?? []}
      pendingQueue={pendingQueue ?? []}
      allRequests={allRequests ?? []}
      leaveTypes={leaveTypes ?? []}
      employees={employees ?? []}
      hasEmployeeRecord={!!me.employeeId}
    />
  );
}
