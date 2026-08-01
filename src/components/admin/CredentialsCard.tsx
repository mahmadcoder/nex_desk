"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2, Eye, ShieldCheck } from "lucide-react";
import { saveProjectCredentials, revealProjectCredentials } from "@/lib/actions/credentials";
import Modal from "@/components/admin/Modal";

type Credential = { label: string; username?: string; secret?: string; url?: string; note?: string };

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none";

const BLANK: Credential = { label: "", username: "", secret: "", url: "", note: "" };

/**
 * The client's infrastructure logins, held until handover.
 *
 * The handover PDF has always rendered these and nothing has ever written
 * them, so every pack shipped with an empty credentials section.
 *
 * Values are encrypted at rest and only decrypted when someone deliberately
 * opens the editor — the page itself never carries plaintext, so a stray
 * screenshot or an over-the-shoulder glance shows nothing.
 */
export default function CredentialsCard({
  projectId,
  count,
}: {
  projectId: string;
  count: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);

  const openEditor = () => {
    setLoading(true);
    start(async () => {
      try {
        const res = await revealProjectCredentials(projectId);
        setItems(res.items.length ? res.items : [{ ...BLANK }]);
        setOpen(true);
      } catch (e: any) {
        toast.error(e?.message || "Could not open the credentials.");
      } finally {
        setLoading(false);
      }
    });
  };

  const update = (i: number, patch: Partial<Credential>) =>
    setItems((p) => p.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const save = () => {
    start(async () => {
      try {
        const res = await saveProjectCredentials(projectId, items);
        toast.success(
          res.count
            ? `${res.count} credential${res.count === 1 ? "" : "s"} saved and encrypted.`
            : "Credentials cleared."
        );
        setOpen(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "Could not save those.");
      }
    });
  };

  return (
    <section className="card space-y-3 border-ink-600 p-5">
      <h2 className="flex items-center gap-2 border-b border-ink-700 pb-3 text-base font-semibold text-bone-50">
        <KeyRound size={16} className="text-lime-400" /> Client credentials
      </h2>

      <p className="text-xs leading-relaxed text-bone-300">
        {count > 0 ? (
          <>
            <strong className="text-bone-100">
              {count} credential{count === 1 ? "" : "s"} stored
            </strong>{" "}
            — encrypted, and included in the handover pack when you transfer ownership.
          </>
        ) : (
          <>
            Nothing stored. The handover pack renders these, so without them the client
            receives a pack with an empty credentials section.
          </>
        )}
      </p>

      <div className="flex items-start gap-2 rounded-lg border border-ink-600 bg-ink-900/60 p-2.5">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-lime-400" />
        <p className="text-[11px] leading-relaxed text-bone-300">
          Encrypted at rest with AES-256. The page never loads them — they are decrypted only
          when you open the editor, and every reveal is recorded in the account history.
        </p>
      </div>

      <button className="btn h-9 w-full justify-center px-4 text-sm" onClick={openEditor} disabled={loading || pending}>
        <Eye className="mr-1.5 h-3.5 w-3.5" />
        {loading ? "Opening…" : count > 0 ? "View & edit" : "Add credentials"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        title="Client credentials"
        eyebrow="Handover"
        description="Hosting, domain, analytics, mail — whatever the client will need to own this outright."
        footer={
          <>
            <button className="btn h-10" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn btn-primary h-10" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save & encrypt"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {items.map((c, i) => (
            <div key={i} className="space-y-2.5 rounded-lg border border-ink-600 bg-ink-900/50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <input
                  className={`${field} font-medium`}
                  placeholder="What is it? e.g. Hostinger cPanel"
                  value={c.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
                <button
                  className="shrink-0 rounded p-2 text-bone-400 transition-colors hover:bg-ink-800 hover:text-rose-400"
                  onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <input
                  className={field}
                  placeholder="Username or email"
                  value={c.username ?? ""}
                  onChange={(e) => update(i, { username: e.target.value })}
                />
                <input
                  className={`${field} font-mono`}
                  placeholder="Password or key"
                  value={c.secret ?? ""}
                  onChange={(e) => update(i, { secret: e.target.value })}
                />
              </div>

              <input
                className={`${field} font-mono text-xs`}
                placeholder="https://login-url…"
                value={c.url ?? ""}
                onChange={(e) => update(i, { url: e.target.value })}
              />
              <input
                className={field}
                placeholder="Note — e.g. 2FA is on the client's phone"
                value={c.note ?? ""}
                onChange={(e) => update(i, { note: e.target.value })}
              />
            </div>
          ))}

          <button
            className="btn h-9 w-full justify-center px-4 text-sm"
            onClick={() => setItems((p) => [...p, { ...BLANK }])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add another
          </button>

          <p className="text-[11px] leading-relaxed text-bone-300">
            These go into the handover PDF, which only sends once the project is paid in
            full. Do not put your own agency logins here — this is what the client takes
            ownership of.
          </p>
        </div>
      </Modal>
    </section>
  );
}
