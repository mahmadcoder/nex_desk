import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import {
  Users, MapPin, GraduationCap, DollarSign, Calendar,
  Briefcase, Mail, Phone, ExternalLink, ShieldCheck, Award, ArrowLeft
} from "lucide-react";
import EmployeeClientAssignments from "@/components/admin/EmployeeClientAssignments";
import EmployeeAccessCard from "@/components/admin/EmployeeAccessCard";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const db = createAdminClient();
  const { data: employee } = await db.from("employees").select("full_name, job_title").eq("id", id).single();
  if (!employee) return { title: "Employee Profile — Nex Desk Admin" };
  return {
    title: `${employee.full_name} — Employee Profile`,
    description: `${employee.full_name} (${employee.job_title}) team member profile and client assignments.`,
  };
}

export const revalidate = 0;

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createAdminClient();

  const [{ data: employee }, { data: assignments, error: assignmentsError }, { data: allClients }] =
    await Promise.all([
      db.from("employees").select("*").eq("id", id).single(),
      db.from("client_employee_assignments")
        .select("*, clients(id, name, email, company)")
        .eq("employee_id", id),
      db.from("clients").select("id, name, email, company"),
    ]);

  if (!employee) notFound();

  // Never swallow this one: if the embed can't resolve (PGRST200) the panel
  // silently reads "(0)" even when assignments exist, which is what made this
  // bug so hard to spot.
  if (assignmentsError) {
    console.error("Failed to load client assignments for employee", id, assignmentsError);
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div>
        <Link
          href="/nx-control/employees"
          className="mono-tag text-xs text-bone-400 hover:text-lime-400 transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={12} /> ← Back to Employee Directory
        </Link>
      </div>

      {/* Hero Profile Header */}
      <div className="card p-6 border-ink-600 bg-ink-900/90">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-lime-400/40 bg-ink-800 shrink-0 shadow-lg">
              {employee.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={employee.avatar_url} alt={employee.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-bold text-lime-400 bg-lime-400/10">
                  {employee.full_name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-bone-50">{employee.full_name}</h1>
                <span className="mono-tag text-xs bg-lime-400/10 text-lime-400 px-2.5 py-0.5 rounded-full border border-lime-400/30 font-medium">
                  {employee.seniority}
                </span>
                <span
                  className={`mono-tag text-xs px-2 py-0.5 rounded-full ${
                    employee.status === "Active"
                      ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                      : "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                  }`}
                >
                  ● {employee.status}
                </span>
              </div>

              <p className="mt-1 text-sm font-medium text-bone-200">{employee.job_title}</p>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-bone-300">
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-bone-400" />
                  <a href={`mailto:${employee.email}`} className="hover:text-lime-400 transition-colors">
                    {employee.email}
                  </a>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-bone-400" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {(employee.city || employee.country) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-bone-400" />
                    <span>{[employee.city, employee.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-bone-400" />
                  <span>Joined {employee.joining_date}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-ink-800/80 border-ink-700 min-w-[220px] text-right">
            <p className="mono-tag text-[10px] text-bone-400">Monthly Compensation</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-lime-400">
              {employee.salary_currency} {Number(employee.salary_amount).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-bone-400 font-mono">Type: {employee.employment_type}</p>
          </div>
        </div>
      </div>

      {/* Main Grid — Left Details, Right Client Assignments */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Left Overview Cards */}
        <div className="space-y-6">
          {/* Education & Bio */}
          <div className="card p-6 border-ink-600 space-y-4">
            <h2 className="text-base font-semibold text-bone-50 flex items-center gap-2">
              <GraduationCap size={16} className="text-lime-400" /> Education & Background
            </h2>
            <div className="space-y-3 text-xs text-bone-300">
              <div>
                <span className="mono-tag text-[10px] block mb-0.5">Qualification / Degree</span>
                <p className="text-sm font-medium text-bone-100">{employee.education || "Not specified"}</p>
              </div>

              <div>
                <span className="mono-tag text-[10px] block mb-0.5">Employment Type</span>
                <p className="text-sm font-medium text-bone-100">{employee.employment_type}</p>
              </div>

              {employee.notes && (
                <div>
                  <span className="mono-tag text-[10px] block mb-0.5">Internal Notes</span>
                  <p className="text-xs text-bone-300 bg-ink-800 p-2.5 rounded border border-ink-700">
                    {employee.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Skills & Tech Stack */}
          <div className="card p-6 border-ink-600 space-y-3">
            <h2 className="text-base font-semibold text-bone-50 flex items-center gap-2">
              <Award size={16} className="text-lime-400" /> Skills & Tech Stack
            </h2>
            {!!employee.skills?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {employee.skills.map((s: string) => (
                  <span
                    key={s}
                    className="rounded bg-ink-800 px-3 py-1 text-xs text-lime-400 border border-ink-600"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-bone-400">No skills specified yet.</p>
            )}
          </div>
        </div>

        {/* Right Client & Project Assignments Hub */}
        <div className="space-y-6">
          <EmployeeAccessCard
            employee={{
              id: employee.id,
              full_name: employee.full_name,
              email: employee.email,
              user_id: employee.user_id ?? null,
              portal_password_preview: employee.portal_password_preview ?? null,
            }}
          />

          <EmployeeClientAssignments
            employee={employee}
            assignments={assignments ?? []}
            allClients={allClients ?? []}
            loadError={assignmentsError?.message ?? null}
          />
        </div>
      </div>
    </div>
  );
}
