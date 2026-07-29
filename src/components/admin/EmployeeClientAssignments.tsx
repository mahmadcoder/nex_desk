"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Plus, Trash2, ExternalLink, Briefcase, Building } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import { assignEmployeeToClient, removeEmployeeFromClient } from "@/lib/actions/cms";

interface Props {
  employee: any;
  assignments: any[];
  allClients: any[];
}

export default function EmployeeClientAssignments({
  employee,
  assignments,
  allClients,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleAssign = () => {
    if (!selectedClientId) return toast.error("Select a client to assign.");

    startTransition(async () => {
      try {
        await assignEmployeeToClient(selectedClientId, employee.id);
        toast.success("Assigned employee to client successfully.");
        setSelectedClientId("");
        setShowAssignModal(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to assign client.");
      }
    });
  };

  const handleRemove = (assignmentId: string, clientName: string) => {
    if (!confirm(`Unassign ${employee.full_name} from ${clientName}?`)) return;

    startTransition(async () => {
      try {
        await removeEmployeeFromClient(assignmentId, undefined, employee.id);
        toast.success("Removed assignment.");
        window.location.reload();
      } catch {
        toast.error("Failed to remove assignment.");
      }
    });
  };

  const clientOptions = [
    { value: "", label: "Select client to assign…" },
    ...allClients.map((c) => ({
      value: c.id,
      label: `${c.name} ${c.company ? `(${c.company})` : ""} — ${c.email}`,
    })),
  ];

  return (
    <div className="card p-6 border-ink-600 space-y-4">
      <div className="flex items-center justify-between border-b border-ink-700 pb-3">
        <div>
          <span className="mono-tag text-xs text-lime-400">Multi-Client Relationship Hub</span>
          <h2 className="text-base font-semibold text-bone-50">
            Assigned Clients & Projects ({assignments.length})
          </h2>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="btn btn-primary h-8 px-3 text-xs flex items-center gap-1.5"
        >
          <Plus size={13} /> Assign Client
        </button>
      </div>

      <div className="space-y-3">
        {assignments.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between p-3.5 rounded-xl bg-ink-800/80 border border-ink-700/80 hover:border-lime-400/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center font-semibold text-xs shrink-0">
                <Building size={16} />
              </div>
              <div>
                <Link
                  href={`/nx-control/clients/${a.clients?.id}`}
                  className="text-sm font-semibold text-bone-50 hover:text-lime-400 transition-colors flex items-center gap-1"
                >
                  {a.clients?.name}
                  {a.clients?.company && (
                    <span className="text-xs text-bone-400 font-normal">
                      ({a.clients.company})
                    </span>
                  )}
                  <ExternalLink size={11} className="text-bone-400" />
                </Link>
                <p className="text-xs text-bone-400 mt-0.5">{a.clients?.email}</p>

                {a.projects?.name && (
                  <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded mt-1 inline-block">
                    Project: {a.projects.name}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleRemove(a.id, a.clients?.name ?? "client")}
              className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-700 transition-colors"
              title="Remove assignment"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {!assignments.length && (
          <div className="p-8 text-center text-bone-400 bg-ink-800/40 rounded-xl border border-ink-700/50">
            <Users size={24} className="mx-auto mb-2 text-bone-500" />
            <p className="text-xs text-bone-200">No clients currently assigned to {employee.full_name}.</p>
            <p className="mt-1 text-[11px]">Click "Assign Client" above to allocate client accounts to this employee.</p>
          </div>
        )}
      </div>

      {/* Modal to Assign Client */}
      {showAssignModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="card w-full max-w-md p-6 bg-ink-900 border-ink-600 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-700 pb-3">
              <div>
                <span className="mono-tag text-xs text-lime-400">Team Assignment</span>
                <h3 className="text-base font-semibold text-bone-50">
                  Assign Client to {employee.full_name}
                </h3>
              </div>
              <button
                className="text-bone-400 hover:text-bone-50 text-sm"
                onClick={() => setShowAssignModal(false)}
              >
                ✕
              </button>
            </div>

            <div>
              <label className="mono-tag text-xs mb-1.5 block">Select Client</label>
              <CustomSelect
                options={clientOptions}
                value={selectedClientId}
                onChange={(val) => setSelectedClientId(val)}
                placeholder="Select client to assign…"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-ink-700 pt-3">
              <button
                className="btn h-8 px-3 text-xs"
                onClick={() => setShowAssignModal(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary h-8 px-4 text-xs"
                onClick={handleAssign}
                disabled={pending}
              >
                {pending ? "Assigning..." : "Assign Client →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
