"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ensureClientPortalAccount, updateClientPermissions, deleteClient } from "@/lib/actions";
import { Key, Copy, Eye, EyeOff, Shield, Trash2, CheckSquare, Square } from "lucide-react";

type ClientPermissions = {
  show_financials?: boolean;
  show_invoices?: boolean;
  show_milestones?: boolean;
  show_files?: boolean;
  show_staging?: boolean;
};

export default function ClientManagerCard({
  client,
}: {
  client: {
    id: string;
    name: string;
    email: string;
    portal_password_preview: string | null;
    portal_access_token: string | null;
    client_permissions: ClientPermissions | null;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const defaultPerms: ClientPermissions = {
    show_financials: true,
    show_invoices: true,
    show_milestones: true,
    show_files: true,
    show_staging: true,
    ...client.client_permissions,
  };

  const [perms, setPerms] = useState<ClientPermissions>(defaultPerms);

  const portalLink = typeof window !== "undefined"
    ? `${window.location.origin}/portal/login?email=${encodeURIComponent(client.email)}`
    : `/portal/login?email=${encodeURIComponent(client.email)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(portalLink);
    toast.success("Portal login link copied to clipboard!");
  };

  const copyCredentials = () => {
    const txt = `Client Portal Login Details:\nURL: ${portalLink}\nEmail: ${client.email}\nPassword: ${client.portal_password_preview || "(Not generated)"}`;
    navigator.clipboard.writeText(txt);
    toast.success("Credentials copied!");
  };

  const handleGenPassword = () => {
    start(async () => {
      try {
        await ensureClientPortalAccount(client.id, newPass || undefined);
        toast.success("Client password updated & credentials saved!");
        setNewPass("");
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to update password.");
      }
    });
  };

  const togglePermission = (key: keyof ClientPermissions) => {
    const updated = { ...perms, [key]: !perms[key] };
    setPerms(updated);
    start(async () => {
      try {
        await updateClientPermissions(client.id, updated);
        toast.success("Client portal visibility updated.");
        router.refresh();
      } catch {
        toast.error("Failed to update visibility.");
      }
    });
  };

  const handleDelete = () => {
    start(async () => {
      try {
        await deleteClient(client.id);
        toast.success(`Deleted ${client.name}.`);
      } catch (e: any) {
        toast.error(e.message || "Failed to delete client.");
      }
    });
  };

  return (
    <div className="card mt-8 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-ink-600 pb-5">
        <div>
          <h2 className="text-lg font-medium flex items-center gap-2 text-bone-50">
            <Key className="h-5 w-5 text-lime-400" />
            Client Portal Credentials & Access Control
          </h2>
          <p className="mt-1 text-sm text-bone-400">
            Manage authentication, credentials, and toggle what this client can view in their portal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn h-9 text-xs" onClick={copyCredentials}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Credentials
          </button>
          <button className="btn h-9 text-xs" onClick={copyLink}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Portal Link
          </button>
          <button
            className="btn h-9 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Client
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Credentials Column */}
        <div className="rounded-lg border border-ink-600 bg-ink-900/60 p-4">
          <p className="mono-tag text-lime-400 mb-3">Portal Login Credentials</p>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-bone-400 block text-xs">Portal Email</span>
              <span className="font-mono text-bone-50">{client.email}</span>
            </div>

            <div>
              <span className="text-bone-400 block text-xs">Saved Portal Password</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-bone-50 bg-ink-950 px-3 py-1.5 rounded border border-ink-600">
                  {showPassword
                    ? client.portal_password_preview || "No password set"
                    : client.portal_password_preview
                    ? "••••••••••••"
                    : "No password set"}
                </span>
                {client.portal_password_preview && (
                  <button
                    type="button"
                    className="p-1.5 text-bone-400 hover:text-bone-50"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-ink-700">
              <span className="text-bone-400 block text-xs mb-1.5">Set / Reset Password</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Leave empty for auto-generated"
                  className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
                <button
                  className="btn btn-primary h-8 px-3 text-xs shrink-0"
                  onClick={handleGenPassword}
                  disabled={pending}
                >
                  {pending ? "Saving…" : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions Column */}
        <div className="rounded-lg border border-ink-600 bg-ink-900/60 p-4">
          <p className="mono-tag text-lime-400 mb-3 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Client View Permissions (Admin Access Control)
          </p>
          <div className="space-y-2.5 text-sm">
            {[
              ["show_financials", "Financial Breakdown (Paid, Balance, Currency)"],
              ["show_invoices", "Invoices & Payment Receipts (PDF Download)"],
              ["show_milestones", "Project Progress & Milestones"],
              ["show_files", "Project Files & Deliverables"],
              ["show_staging", "Live Staging & Preview URLs"],
            ].map(([key, label]) => {
              const active = !!perms[key as keyof ClientPermissions];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePermission(key as keyof ClientPermissions)}
                  className="flex items-center justify-between w-full p-2 rounded hover:bg-ink-800/60 text-left transition-colors"
                >
                  <span className="text-xs text-bone-200">{label}</span>
                  {active ? (
                    <CheckSquare className="h-4 w-4 text-lime-400" />
                  ) : (
                    <Square className="h-4 w-4 text-bone-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-6"
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-red-400">Delete Client</h3>
            <p className="mt-2 text-sm text-bone-400">
              Are you sure you want to delete <strong className="text-bone-100">{client.name}</strong>?
              This will remove their profile, portal credentials, and associated records.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn h-9" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="btn bg-red-600 text-white hover:bg-red-700 h-9"
                onClick={handleDelete}
                disabled={pending}
              >
                {pending ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
