import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import EmployeesClient from "@/components/admin/EmployeesClient";

export const metadata: Metadata = {
  title: "Employees",
  description: "Manage agency team members, employee profiles, salaries, and client assignments.",
};

export const revalidate = 0;

export default async function EmployeesPage() {
  const db = createAdminClient();

  const [{ data: employees }, { data: jobTitles }] = await Promise.all([
    db.from("employees").select("*").order("created_at", { ascending: false }),
    db.from("employee_job_titles").select("*").order("category"),
  ]);

  const DEFAULT_JOB_TITLES = [
    { id: "1", title: "Senior Full-Stack Developer", category: "Engineering" },
    { id: "2", title: "React Native Engineer", category: "Engineering" },
    { id: "3", title: "UI/UX Product Designer", category: "Design" },
    { id: "4", title: "Brand Identity Specialist", category: "Design" },
    { id: "5", title: "Technical SEO Lead", category: "Marketing" },
    { id: "6", title: "Social Media Growth Manager", category: "Marketing" },
    { id: "7", title: "AI Automation Engineer", category: "AI & Automation" },
    { id: "8", title: "Client Success Manager", category: "Operations" },
  ];

  return (
    <div className="space-y-6">
      <EmployeesClient
        employees={employees ?? []}
        jobTitles={jobTitles?.length ? jobTitles : DEFAULT_JOB_TITLES}
      />
    </div>
  );
}
