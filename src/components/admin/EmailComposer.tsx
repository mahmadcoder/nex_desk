"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendClientEmail } from "@/lib/actions";
import { fillTemplate } from "@/lib/utils";

import CustomSelect from "@/components/ui/CustomSelect";

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

  const [language, setLanguage] = useState<"en" | "ar" | "fr" | "de" | "es">("en");

  const languageOptions = [
    { value: "en", label: "English 🇬🇧" },
    { value: "ar", label: "Arabic 🇸🇦 (العربية)" },
    { value: "fr", label: "French 🇫🇷 (Français)" },
    { value: "de", label: "German 🇩🇪 (Deutsch)" },
    { value: "es", label: "Spanish 🇪🇸 (Español)" },
  ];

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
        language,
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

  const clientOptions = [
    { value: "", label: "Pick a client…" },
    ...clients.map((c) => ({ value: c.id, label: `${c.name} — ${c.email}` })),
  ];

  const templateOptions = [
    { value: "", label: "Write from scratch" },
    ...templates.map((t) => ({
      value: t.key,
      label: t.name,
      badge: t.attach_doc ? "+pdf" : undefined,
    })),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="card h-fit p-4">
        <p className="mono-tag mb-3">Templates</p>
        <div className="max-h-[520px] space-y-0.5 overflow-y-auto custom-admin-scrollbar">
          {templates.map((t) => (
            <button
              key={t.key}
              onClick={() => pick(t.key)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                key === t.key ? "bg-ink-700 text-bone-50 font-medium" : "text-bone-400 hover:bg-ink-700/50"
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
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mono-tag mb-1.5 block">Send to</label>
            <CustomSelect
              options={clientOptions}
              value={clientId}
              onChange={(val) => setClientId(val)}
              placeholder="Pick a client…"
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Template</label>
            <CustomSelect
              options={templateOptions}
              value={key}
              onChange={(val) => pick(val)}
              placeholder="Write from scratch"
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Email Language</label>
            <CustomSelect
              options={languageOptions}
              value={language}
              onChange={(val: any) => setLanguage(val)}
              placeholder="English 🇬🇧"
            />
          </div>
        </div>

        {template?.description && (
          <p className="mt-3 text-xs text-bone-400">{template.description}</p>
        )}

        <div className="mt-5">
          <label className="mono-tag mb-1.5 block">Subject</label>
          <input
            dir={language === "ar" ? "rtl" : "ltr"}
            className={`${field} ${language === "ar" ? "text-right font-arabic" : ""}`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="mono-tag block">Message</label>
            {language === "ar" && (
              <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded">
                RTL Mode Active (العربية)
              </span>
            )}
          </div>
          <textarea
            dir={language === "ar" ? "rtl" : "ltr"}
            className={`${field} min-h-72 resize-y leading-relaxed ${language === "ar" ? "text-right font-arabic" : ""}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
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
