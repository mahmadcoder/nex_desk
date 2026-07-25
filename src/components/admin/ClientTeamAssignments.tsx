"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Users, Plus, Trash2, ExternalLink, ShieldCheck, Mail } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import { assignEmployeeToClient, removeEmployeeFromClient } from "@/lib/actions/cms";

interface Props {
  clientId: string;
  assignedEmployees: any[];
  allEmployees: any[];
}

export default function ClientTeamAssignments({
  clientId,
  assignedEmployees,
  allEmployees,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleAssign = () => {
    if (!selectedEmployeeId) return toast.error("Select an employee to assign.");

    startTransition(async () => {
      try {
        await assignEmployeeToClient(clientId, selectedEmployeeId);
        toast.success("Assigned team member to client.");
        setSelectedEmployeeId("");
        setShowModal(false);
        window.location.reload();
      } catch {
        toast.error("Failed to assign employee.");
      }
    });
  };

  const handleRemove = (assignmentId: string, name: string) => {
    if (!confirm(`Unassign ${name} from this client?`)) return;

    startTransition(async () => {
      try {
        await removeEmployeeFromClient(assignmentId, clientId, undefined);
        toast.success("Unassigned employee.");
        window.location.reload();
      } catch {
        toast.error("Failed to unassign employee.");
      }
    });
  };

  const employeeOptions = [
    { value: "", label: "Select team member to assign…" },
    ...allEmployees.map((e) => ({
      value: e.id,
      label: `${e.full_name} (${e.job_title} — ${e.seniority})`,
    })),
  ];

  return (
    <div className="card p-5 border-ink-600 space-y-4 my-6">
      <div className="flex items-center justify-between border-b border-ink-700 pb-3">
        <div>
          <span className="mono-tag text-xs text-lime-400">Assigned Agency Team</span>
          <h2 className="text-base font-semibold text-bone-50">
            Dedicated Employees Working with Client ({assignedEmployees.length})
          </h2>
          <p className="text-xs text-bone-400">These team members will also be visible to the client in their portal.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary h-8 px-3 text-xs flex items-center gap-1.5"
        >
          <Plus size={13} /> Assign Employee
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assignedEmployees.map((a) => {
          const emp = a.employees;
          if (!emp) return null;
          return (
            <div
              key={a.id}
              className="flex items-center justify-between p-3 rounded-xl bg-ink-800/80 border border-ink-700/80 hover:border-lime-400/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden border border-ink-600 bg-ink-700 shrink-0">
                  {emp.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={emp.avatar_url} alt={emp.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-semibold text-lime-400 bg-lime-400/10">
                      {emp.full_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <Link
                    href={`/nx-control/employees/${emp.id}`}
                    className="text-sm font-semibold text-bone-50 hover:text-lime-400 transition-colors flex items-center gap-1"
                  >
                    {emp.full_name}
                    <ExternalLink size={11} className="text-bone-400" />
                  </Link>
                  <p className="text-xs text-bone-300 font-medium">{emp.job_title}</p>
                  <span className="mono-tag text-[9px] text-lime-400">{emp.seniority}</span>
                </div>
              </div>

              <button
                onClick={() => handleRemove(a.id, emp.full_name)}
                className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-700 transition-colors"
                title="Unassign employee"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}

        {!assignedEmployees.length && (
          <div className="col-span-full p-6 text-center text-bone-400 bg-ink-800/40 rounded-xl border border-ink-700/50">
            <Users size={24} className="mx-auto mb-2 text-bone-500" />
            <p className="text-xs text-bone-200">No employees assigned to this client yet.</p>
            <p className="mt-1 text-[11px]">Assign employees so the client can view their dedicated team on the portal.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card w-full max-w-md p-6 bg-ink-900 border-ink-600 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-700 pb-3">
              <div>
                <span className="mono-tag text-xs text-lime-400">Team Allocation</span>
                <h3 className="text-base font-semibold text-bone-50">Assign Employee to Client</h3>
              </div>
              <button
                className="text-bone-400 hover:text-bone-50 text-sm"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div>
              <label className="mono-tag text-xs mb-1.5 block">Select Agency Team Member</label>
              <CustomSelect
                options={employeeOptions}
                value={selectedEmployeeId}
                onChange={(val) => setSelectedEmployeeId(val)}
                placeholder="Select team member to assign…"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-ink-700 pt-3">
              <button
                className="btn h-8 px-3 text-xs"
                onClick={() => setShowModal(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary h-8 px-4 text-xs"
                onClick={handleAssign}
                disabled={pending}
              >
                {pending ? "Assigning..." : "Assign Employee →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
