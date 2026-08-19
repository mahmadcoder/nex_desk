"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users, UserPlus, Search, MapPin, GraduationCap, DollarSign,
  Briefcase, Award, Trash2, Edit3, Plus, ChevronRight, Layers,
  ExternalLink, Mail, Phone, Calendar, X
} from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import StatusControl, { STATUS_UI } from "@/components/admin/StatusControl";
import CustomSelect from "@/components/ui/CustomSelect";
import ConfirmModal from "@/components/admin/ConfirmModal";
import RequestDetailsClient from "@/components/admin/RequestDetailsClient";
import { saveEmployee, deleteEmployee, saveJobTitle, deleteJobTitle } from "@/lib/actions/cms";
import { checkEmailExists } from "@/lib/actions";

import type { Employee, JobTitle } from "@/types/admin";
export type { Employee, JobTitle };

const SENIORITY_OPTIONS = [
  { value: "Junior", label: "Junior" },
  { value: "Mid-Level", label: "Mid-Level" },
  { value: "Senior", label: "Senior" },
  { value: "Lead / Head", label: "Lead / Head" },
  { value: "Executive", label: "Executive" },
];

const TYPE_OPTIONS = [
  { value: "Full-Time", label: "Full-Time" },
  { value: "Part-Time", label: "Part-Time" },
  { value: "Contract", label: "Contract" },
  { value: "Internship", label: "Internship" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "PKR", label: "PKR (Rs)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED (د.إ)" },
];

const LANG_OPTIONS = [
  { value: "en", label: "English 🇬🇧" },
  { value: "ar", label: "Arabic 🇸🇦 (العربية)" },
  { value: "fr", label: "French 🇫🇷 (Français)" },
  { value: "de", label: "German 🇩🇪 (Deutsch)" },
  { value: "es", label: "Spanish 🇪🇸 (Español)" },
];

export default function EmployeesClient({
  employees,
  jobTitles,
  departments = [],
}: {
  employees: Employee[];
  jobTitles: JobTitle[];
  /** Empty before the 2027-30 migration — the field simply does not render. */
  departments?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<Partial<Employee> | null>(null);
  const [welcomeLang, setWelcomeLang] = useState<"en" | "ar" | "fr" | "de" | "es">("en");
  const [showJobTitlesModal, setShowJobTitlesModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Engineering");
  const [skillInput, setSkillInput] = useState("");
  const [emailError, setEmailError] = useState("");

  const filtered = employees.filter((e) => {
    const q = query.toLowerCase();
    const matchesQ =
      e.full_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.job_title.toLowerCase().includes(q) ||
      (e.city && e.city.toLowerCase().includes(q)) ||
      (e.country && e.country.toLowerCase().includes(q));

    const matchesSeniority =
      seniorityFilter === "all" || e.seniority.toLowerCase() === seniorityFilter.toLowerCase();

    const matchesStatus = statusFilter === "all" || (e.status ?? "Active") === statusFilter;

    return matchesQ && matchesSeniority && matchesStatus;
  });

  const totalPayroll = employees.reduce((sum, e) => sum + (Number(e.salary_amount) || 0), 0);

  const handleSave = () => {
    if (!editing?.full_name || !editing?.email || !editing?.job_title) {
      toast.error("Full Name, Email and Job Title are required.");
      return;
    }

    startTransition(async () => {
      try {
        const saved = await saveEmployee(
          editing.id ?? null,
          {
            full_name: editing.full_name,
            email: editing.email,
            phone: editing.phone ?? null,
            avatar_url: editing.avatar_url ?? null,
            job_title: editing.job_title,
            seniority: editing.seniority ?? "Senior",
            city: editing.city ?? null,
            country: editing.country ?? null,
            education: editing.education ?? null,
            salary_amount: Number(editing.salary_amount) || 0,
            salary_currency: editing.salary_currency ?? "USD",
            employment_type: editing.employment_type ?? "Full-Time",
            department_id: (editing as any).department_id || null,
            joining_date: editing.joining_date ?? new Date().toISOString().slice(0, 10),
            leaving_date: editing.leaving_date || null,
            status: editing.status ?? "Active",
            skills: editing.skills ?? [],
            notes: editing.notes ?? null,
          },
          welcomeLang
        );
        if (!editing.id) {
          if (saved?.emailed) {
            toast.success("Employee hired. Login credentials emailed to them.");
          } else {
            toast.warning(
              `Employee hired, but the credentials email failed${saved?.emailError ? `: ${saved.emailError}` : "."} Use "Send login details" on their profile to retry.`
            );
          }
        } else if (saved?.emailed === false) {
          toast.warning("Employee updated, but the sign-in email notice failed to send.");
        } else {
          toast.success("Employee updated successfully.");
        }
        setEditing(null);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "Failed to save employee.");
      }
    });
  };

  const [deletingEmployee, setDeletingEmployee] = useState<{ id: string; name: string } | null>(null);
  const [notifyEmployeeByEmail, setNotifyEmployeeByEmail] = useState(false);

  const confirmDeleteEmployee = () => {
    if (!deletingEmployee) return;
    startTransition(async () => {
      try {
        const res = await deleteEmployee(deletingEmployee.id, { sendEmail: notifyEmployeeByEmail });
        toast.success(
          res.emailSent
            ? `${deletingEmployee.name} deactivated. Offboarding email sent.`
            : `${deletingEmployee.name} has been removed from active staff.`
        );
        setDeletingEmployee(null);
        router.refresh();
      } catch {
        toast.error("Failed to remove employee.");
      }
    });
  };

  const handleAddJobTitle = () => {
    if (!newTitle.trim()) return toast.error("Enter a job title.");
    startTransition(async () => {
      try {
        await saveJobTitle(null, { title: newTitle.trim(), category: newCategory });
        toast.success(`Added position "${newTitle.trim()}".`);
        setNewTitle("");
        router.refresh();
      } catch {
        toast.error("Failed to add job title.");
      }
    });
  };

  const handleDeleteJobTitle = (id: string) => {
    startTransition(async () => {
      try {
        await deleteJobTitle(id);
        toast.success("Job title position removed.");
        router.refresh();
      } catch {
        toast.error("Failed to delete job title.");
      }
    });
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    const current = editing?.skills ?? [];
    if (!current.includes(skillInput.trim())) {
      setEditing({ ...editing, skills: [...current, skillInput.trim()] });
    }
    setSkillInput("");
  };

  const removeSkill = (s: string) => {
    setEditing({ ...editing, skills: (editing?.skills ?? []).filter((x) => x !== s) });
  };

  const jobTitleOptions = [
    { value: "", label: "Select Position Job Title…" },
    ...jobTitles.map((j) => ({ value: j.title, label: `${j.title} (${j.category})` })),
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-ink-600 pb-6">
        <div>
          <span className="mono-tag text-lime-400">Team & Talent Hub</span>
          <h1 className="mt-1 text-2xl font-semibold text-bone-50">Agency Employees ({employees.length})</h1>
          <p className="mt-1 text-xs text-bone-400">Manage employee profiles, senior roles, client assignments, and payroll</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* The other way in: send someone the checklist and let them fill it
              in, rather than typing nine fields off a WhatsApp thread. */}
          <RequestDetailsClient kind="staff" />
          <button
            onClick={() => setShowJobTitlesModal(true)}
            className="btn h-9 px-3.5 text-sm flex items-center gap-2 border-ink-600 bg-ink-800 text-bone-200 hover:text-bone-50"
          >
            <Layers size={14} className="text-lime-400" /> Manage Job Titles
          </button>
          <button
            onClick={() =>
              setEditing({
                full_name: "",
                email: "",
                phone: "",
                avatar_url: "",
                job_title: jobTitles[0]?.title ?? "Senior Full-Stack Developer",
                seniority: "Senior",
                city: "",
                country: "",
                education: "",
                salary_amount: 3000,
                salary_currency: "USD",
                employment_type: "Full-Time",
                joining_date: new Date().toISOString().slice(0, 10),
                status: "Active",
                skills: ["React", "TypeScript", "Next.js"],
              })
            }
            className="btn btn-primary h-9 px-4 text-sm flex items-center gap-2"
          >
            <UserPlus size={14} /> Add Employee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5 border-ink-600 flex items-center gap-4">
          <div className="rounded-xl bg-lime-400/10 p-3 text-lime-400 border border-lime-400/20">
            <Users size={22} />
          </div>
          <div>
            <p className="mono-tag text-[10px]">Total Staff</p>
            <p className="mt-1 text-2xl font-medium tracking-tight text-bone-50">{employees.length}</p>
          </div>
        </div>

        <div className="card p-5 border-ink-600 flex items-center gap-4">
          <div className="rounded-xl bg-amber-400/10 p-3 text-amber-400 border border-amber-400/20">
            <Award size={22} />
          </div>
          <div>
            <p className="mono-tag text-[10px]">Senior & Leads</p>
            <p className="mt-1 text-2xl font-medium tracking-tight text-bone-50">
              {employees.filter((e) => ["Senior", "Lead / Head", "Executive"].includes(e.seniority)).length}
            </p>
          </div>
        </div>

        <div className="card p-5 border-ink-600 flex items-center gap-4">
          <div className="rounded-xl bg-emerald-400/10 p-3 text-emerald-400 border border-emerald-400/20">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="mono-tag text-[10px]">Monthly Payroll</p>
            <p className="mt-1 text-2xl font-medium tracking-tight text-bone-50">
              ${totalPayroll.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="card p-5 border-ink-600 flex items-center gap-4">
          <div className="rounded-xl bg-sky-400/10 p-3 text-sky-400 border border-sky-400/20">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="mono-tag text-[10px]">Open Positions</p>
            <p className="mt-1 text-2xl font-medium tracking-tight text-bone-50">{jobTitles.length}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-ink-900/60 p-3 rounded-xl border border-ink-700/60">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-bone-400" />
          <input
            type="text"
            placeholder="Search employees by name, email, job title, city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-ink-600 bg-ink-800 pl-9 pr-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="mono-tag text-[11px]">Seniority:</span>
          {["all", "Junior", "Mid-Level", "Senior", "Lead / Head"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSeniorityFilter(lvl)}
              className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                seniorityFilter === lvl
                  ? "bg-lime-400/20 text-lime-400 border border-lime-400/30 font-medium"
                  : "text-bone-400 hover:text-bone-100 hover:bg-ink-800"
              }`}
            >
              {lvl === "all" ? "All Roles" : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Access, as its own row. The grid gave no way to see who could still
          sign in without opening every person one at a time. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono-tag text-[11px]">Access:</span>
        {(["all", "Active", "On Leave", "Terminated"] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
              statusFilter === st
                ? "bg-lime-400/20 text-lime-400 border border-lime-400/30 font-medium"
                : "text-bone-400 hover:text-bone-100 hover:bg-ink-800"
            }`}
          >
            {st === "all" ? "Everyone" : STATUS_UI[st].label}
            {st !== "all" && (
              <span className="ml-1.5 text-bone-500">
                {employees.filter((e) => (e.status ?? "Active") === st).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Employee Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <div
            key={e.id}
            /* Dimmed when they cannot sign in — the grid used to render a
               terminated employee identically to an active one. */
            className={`card p-5 hover:border-lime-400/40 transition-all flex flex-col justify-between space-y-4 group ${
              e.status === "Terminated"
                ? "border-ink-700/50 bg-ink-950/60 opacity-65"
                : "border-ink-600"
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden border border-ink-600 bg-ink-800 shrink-0">
                    {e.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.avatar_url} alt={e.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-sm font-semibold text-lime-400 bg-lime-400/10">
                        {e.full_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/nx-control/employees/${e.id}`}
                      className="text-base font-semibold text-bone-50 hover:text-lime-400 transition-colors flex items-center gap-1 group-hover:translate-x-0.5 duration-200"
                    >
                      {e.full_name}
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-lime-400" />
                    </Link>
                    <p className="text-xs text-bone-300 font-medium mt-0.5">{e.job_title}</p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusControl
                    employeeId={e.id}
                    name={e.full_name}
                    status={e.status ?? "Active"}
                  />
                  <span className="mono-tag text-[10px] bg-lime-400/10 text-lime-400 px-2 py-0.5 rounded border border-lime-400/20">
                    {e.seniority}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-ink-700/60 pt-3 text-xs text-bone-300">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-bone-500 shrink-0" />
                  <span className="truncate">{e.email}</span>
                </div>
                {(e.city || e.country) && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-bone-500 shrink-0" />
                    <span>{[e.city, e.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {e.education && (
                  <div className="flex items-center gap-2">
                    <GraduationCap size={13} className="text-bone-500 shrink-0" />
                    <span className="truncate">{e.education}</span>
                  </div>
                )}
              </div>

              {/* Skills Tags */}
              {!!e.skills?.length && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {e.skills.slice(0, 4).map((s) => (
                    <span key={s} className="rounded bg-ink-800 px-2 py-0.5 text-[10px] text-bone-400">
                      {s}
                    </span>
                  ))}
                  {e.skills.length > 4 && (
                    <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-bone-500">
                      +{e.skills.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-ink-700/60 pt-3 flex items-center justify-between">
              <div className="text-[11px] font-mono text-lime-400 font-medium">
                {e.salary_currency} {Number(e.salary_amount).toLocaleString()}/mo
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href={`/nx-control/employees/${e.id}`}
                  className="px-2.5 py-1 rounded bg-ink-800 text-[11px] text-bone-200 hover:text-lime-400 hover:bg-ink-700 transition-colors flex items-center gap-1"
                >
                  Profile <ExternalLink size={11} />
                </Link>
                <button
                  onClick={() => setEditing(e)}
                  className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800"
                  title="Edit employee"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => setDeletingEmployee({ id: e.id, name: e.full_name })}
                  className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-800"
                  title="Delete employee"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!filtered.length && (
        <div className="card p-12 text-center text-bone-400">
          <Users size={32} className="mx-auto mb-3 text-bone-500" />
          <p className="text-base text-bone-200">No employees match your search filter.</p>
          <p className="mt-1 text-xs">Click "Add Employee" above to recruit team members.</p>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="card w-full max-w-2xl p-5 sm:p-7 bg-ink-900 border-ink-600 relative space-y-4 shadow-2xl my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto custom-admin-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-700 pb-3">
              <div>
                <span className="mono-tag text-xs text-lime-400">Staff Profile Engine</span>
                <h2 className="text-lg font-semibold text-bone-50">
                  {editing.id ? `Edit ${editing.full_name}` : "Hiring / Add New Employee"}
                </h2>
              </div>
              <button type="button" className="p-1.5 rounded-lg text-bone-400 hover:text-bone-50 hover:bg-ink-800 transition-colors cursor-pointer" onClick={() => setEditing(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Profile Image Upload */}
              <div>
                <label className="mono-tag text-xs mb-1.5 block">Employee Profile Photo</label>
                <ImageUpload
                  value={editing.avatar_url ?? ""}
                  onChange={(url) => setEditing({ ...editing, avatar_url: url })}
                  folder="employees"
                  shape="circle"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="mono-tag text-xs mb-1 block">Full Name *</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                    placeholder="e.g. Sarah Jenkins"
                    value={editing.full_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Work Email *</label>
                  <input
                    type="email"
                    className={`w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none ${emailError ? "border-rose-500/80 focus:border-rose-500" : ""}`}
                    placeholder="sarah@nexdesk.com"
                    value={editing.email ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditing({ ...editing, email: val });
                      if (emailError) setEmailError("");
                    }}
                    onBlur={async () => {
                      if (editing.email && editing.email.includes("@")) {
                        const res = await checkEmailExists({ email: editing.email, target: "employee", excludeId: editing.id });
                        if (res.exists) {
                          setEmailError(res.message || "An employee profile with this email address already exists.");
                        } else {
                          setEmailError("");
                        }
                      }
                    }}
                  />
                  {emailError && (
                    <p className="mt-1 text-xs text-rose-400 font-medium flex items-center gap-1 animate-in fade-in">
                      <span>⚠️</span> {emailError}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="mono-tag text-xs mb-1 block">Job Title Position *</label>
                  <CustomSelect
                    options={jobTitleOptions}
                    value={editing.job_title ?? ""}
                    onChange={(val) => setEditing({ ...editing, job_title: val })}
                    placeholder="Select Position…"
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Seniority Level</label>
                  <CustomSelect
                    options={SENIORITY_OPTIONS}
                    value={editing.seniority ?? "Senior"}
                    onChange={(val) => setEditing({ ...editing, seniority: val })}
                  />
                </div>
                {departments.length > 0 && (
                  <div>
                    <label className="mono-tag text-xs mb-1 block">Department</label>
                    <CustomSelect
                      options={[
                        { value: "", label: "Not assigned" },
                        ...departments.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                      value={(editing as any).department_id ?? ""}
                      onChange={(val) => setEditing({ ...editing, department_id: val } as any)}
                    />
                  </div>
                )}
                <div>
                  <label className="mono-tag text-xs mb-1 block">Employment Type</label>
                  <CustomSelect
                    options={TYPE_OPTIONS}
                    value={editing.employment_type ?? "Full-Time"}
                    onChange={(val) => setEditing({ ...editing, employment_type: val })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mono-tag text-xs mb-1 block">Monthly Salary</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none font-mono"
                    value={editing.salary_amount ?? 0}
                    onChange={(e) => setEditing({ ...editing, salary_amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Currency</label>
                  <CustomSelect
                    options={CURRENCY_OPTIONS}
                    value={editing.salary_currency ?? "USD"}
                    onChange={(val) => setEditing({ ...editing, salary_currency: val })}
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Joining Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none font-mono"
                    value={editing.joining_date ?? ""}
                    onChange={(e) => setEditing({ ...editing, joining_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Status</label>
                <CustomSelect
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "On Leave", label: "On Leave" },
                    { value: "Terminated", label: "Terminated" },
                  ]}
                  value={editing.status ?? "Active"}
                  onChange={(v) => setEditing({ ...editing, status: v })}
                />
                <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                  <strong>Terminated blocks sign-in immediately</strong> — they lose the panel the
                  moment you save. On Leave keeps access, since somebody on leave still needs
                  their pay and leave pages.
                </p>
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Last Working Day (optional)</label>
                <input
                  type="date"
                  min={editing.joining_date ?? undefined}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none font-mono"
                  value={editing.leaving_date ?? ""}
                  onChange={(e) => setEditing({ ...editing, leaving_date: e.target.value || null })}
                />
                <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                  Used to work out the final month&rsquo;s pay from the days actually worked.
                  It does <strong>not</strong> switch off their account — set Status to
                  Terminated for that, so recording a future last day cannot cut someone off today.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mono-tag text-xs mb-1 block">City</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                    placeholder="e.g. London"
                    value={editing.city ?? ""}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Country</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                    placeholder="e.g. United Kingdom"
                    value={editing.country ?? ""}
                    onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Education / Degree</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                    placeholder="BSc Computer Science"
                    value={editing.education ?? ""}
                    onChange={(e) => setEditing({ ...editing, education: e.target.value })}
                  />
                </div>
              </div>

              {/* Skills Tag Builder */}
              <div>
                <label className="mono-tag text-xs mb-1 block">Skills & Tech Stack Tags</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                    placeholder="Add skill tag (e.g. React, Figma, SEO)..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <button type="button" onClick={addSkill} className="btn btn-primary h-8 px-3 text-xs">
                    Add
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(editing.skills ?? []).map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded bg-ink-800 px-2.5 py-1 text-xs text-lime-400 border border-ink-600"
                    >
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="text-bone-400 hover:text-rose-400">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {!editing.id && (
                <div className="rounded-lg bg-ink-800/80 p-3 border border-ink-600 space-y-2">
                  <label className="mono-tag text-xs text-lime-400 block">Welcome Email Language</label>
                  <CustomSelect
                    options={LANG_OPTIONS}
                    value={welcomeLang}
                    onChange={(val: any) => setWelcomeLang(val)}
                  />
                  <p className="text-[11px] text-bone-400">
                    When created, an automated onboarding welcome email will be sent to the employee in this language.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-ink-700 pt-3">
              <button className="btn h-9 px-4 text-sm" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-sm" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : editing.id ? "Update Employee" : "Hire Employee →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Job Titles Modal */}
      {showJobTitlesModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-xs p-4">
          <div className="card w-full max-w-md p-6 bg-ink-900 border-ink-600 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-700 pb-3">
              <div>
                <span className="mono-tag text-xs text-lime-400">Agency Positions Catalog</span>
                <h2 className="text-lg font-semibold text-bone-50">Manage Job Titles</h2>
              </div>
              <button className="text-bone-400 hover:text-bone-50 text-sm" onClick={() => setShowJobTitlesModal(false)}>✕</button>
            </div>

            {/* Add Job Title Form */}
            <div className="space-y-3 bg-ink-800/60 p-3 rounded-lg border border-ink-700">
              <div>
                <label className="mono-tag text-xs mb-1 block">New Position Title</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="e.g. Social Media Manager"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Service Department</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="e.g. Marketing / Engineering"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              </div>

              <button onClick={handleAddJobTitle} className="btn btn-primary h-8 w-full text-xs justify-center" disabled={pending}>
                + Add Position Title
              </button>
            </div>

            {/* Existing Job Titles List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 custom-admin-scrollbar">
              {jobTitles.map((j) => (
                <div key={j.id} className="flex items-center justify-between p-2.5 rounded bg-ink-800 border border-ink-700/60 text-xs">
                  <div>
                    <p className="font-medium text-bone-50">{j.title}</p>
                    <span className="mono-tag text-[10px] text-bone-400">{j.category}</span>
                  </div>
                  <button onClick={() => handleDeleteJobTitle(j.id)} className="text-bone-400 hover:text-rose-400 p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Employee Modal */}
      <ConfirmModal
        isOpen={!!deletingEmployee}
        title={`Deactivate / Remove ${deletingEmployee?.name}?`}
        description={`This removes ${deletingEmployee?.name} from the active staff directory and revokes access to the control center. Attendance and past work records remain safely preserved in the database.`}
        confirmText="Deactivate Staff"
        isDanger={true}
        pending={pending}
        onConfirm={confirmDeleteEmployee}
        onClose={() => setDeletingEmployee(null)}
      >
        <div className="rounded-lg border border-ink-600 bg-ink-800/80 p-3 text-left">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-bone-200">
            <input
              type="checkbox"
              checked={notifyEmployeeByEmail}
              onChange={(e) => setNotifyEmployeeByEmail(e.target.checked)}
              className="h-4 w-4 rounded border-ink-500 bg-ink-900 text-lime-400 focus:ring-lime-400 cursor-pointer"
            />
            <span className="font-medium">Send offboarding email notification to employee</span>
          </label>
          <p className="mt-1 text-[11px] text-bone-400 pl-6.5">
            Sends formal deactivation notice and appreciation for their contribution to the agency.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}
