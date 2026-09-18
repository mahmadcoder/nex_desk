import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

export default async function StaffRootPage() {
  const me = await getCurrentStaff();
  if (me) {
    redirect(`/${process.env.ADMIN_PATH || "nx-control"}`);
  }
  redirect("/staff/login");
}
