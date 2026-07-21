"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendClientEmail } from "@/lib/actions";
import { fillTemplate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field = "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

export default function EmailComposer({
  templates, clients,
}: { templates: any[]; clients: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const template = templates.find((t) => t.key === key);
  const client = clients.find((c) => c.id === clientId);

  const vars = {
    client_name: client?.name ?? "there",
    company_name: client?.company ?? "",
    project_name: "your project",
    portal_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/portal`,
    sender_name: "Nex Desk",
  };

  function pick(k: string) {
    setKey(k);
    const t = templates.find((x) => x.key === k);
    if (t) {
      setSubject(fillTemplate(t.subject, vars));
      setBody(fillTemplate(t.body, vars));
    }
  }

  async function send() {
    if (!client) return toast.error("Pick who this is going to.");
    if (!subject.trim()) return toast.error("The subject line is empty.");
    setBusy(true);
    try {
      const res = await sendClientEmail({
        templateKey: key || "manual",
        to: client.email,
        clientId: client.id,
        subject,
        body,
      });
      if (!res.ok) throw new Error(res.error);
      toast.success(`Sent to ${client.email}.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="card h-fit p-4">
        <p className="mono-tag mb-3">Templates</p>
        <div className="max-h-[520px] space-y-0.5 overflow-y-auto">
          {templates.map((t) => (
            <button
              key={t.key}
              onClick={() => pick(t.key)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                key === t.key ? "bg-ink-700 text-bone-50" : "text-bone-400 hover:bg-ink-700/50"
              }`}
            >
              {t.name}
              {t.attach_doc && (
                <span className="mono-tag ml-1.5 text-[0.625rem] text-lime-400">+pdf</span>
              )}
            </button>
          ))}
        </div>
      </aside>

      <div className="card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mono-tag mb-1.5 block">Send to</label>
            <select className={field} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Pick a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Template</label>
            <select className={field} value={key} onChange={(e) => pick(e.target.value)}>
              <option value="">Write from scratch</option>
              {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {template?.description && (
          <p className="mt-3 text-xs text-bone-400">{template.description}</p>
        )}

        <div className="mt-5">
          <label className="mono-tag mb-1.5 block">Subject</label>
          <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div className="mt-4">
          <label className="mono-tag mb-1.5 block">Message</label>
          <textarea className={`${field} min-h-72 resize-y leading-relaxed`}
            value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="mt-1.5 text-xs text-bone-400">
            Variables like {"{{client_name}}"} are already filled in for the client you picked. Edit freely before sending.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-ink-600 pt-5">
          <p className="text-xs text-bone-400">
            {template?.attach_doc
              ? `This template normally carries a ${String(template.attach_doc).replace(/_/g, " ")} PDF — attach it from the relevant project or invoice screen.`
              : "No attachment on this one."}
          </p>
          <button className="btn btn-primary h-10" onClick={send} disabled={busy}>
            {busy ? "Sending…" : "Send email"}
          </button>
        </div>
      </div>
    </div>
  );
}
