"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, Send, CheckCircle2, Users, FileText, Sparkles, X } from "lucide-react";
import { sendClientEmail } from "@/lib/actions";

interface Subscriber {
  id: string;
  email: string;
  created_at: string;
  is_active: boolean;
}

interface BroadcastModalProps {
  subscribers: Subscriber[];
  isOpen: boolean;
  onClose: () => void;
}

const TEMPLATE_PRESETS = [
  {
    key: "agency_update",
    title: "Agency Monthly Update",
    subject: "Nex Desk Monthly Dispatch — What we shipped & built this month",
    body: `Hi {{client_name}},\n\nHere is a quick snapshot of what our engineering and design team at Nex Desk has been up to over the past month.\n\nHighlights:\n• Delivered 3 new enterprise web apps\n• Scaled client infrastructure to 99.99% uptime\n• Published new technical case studies\n\nCheck out our latest case studies and agency portfolio:\nhttps://nexdesk.agency/work\n\nBest regards,\nNex Desk Team`,
  },
  {
    key: "case_study_spotlight",
    title: "Case Study Spotlight",
    subject: "Spotlight: How we built a high-scale platform for our client",
    body: `Hi {{client_name}},\n\nWe just published a deep dive on how we engineered a custom software system to streamline business operations and drive 3x efficiency.\n\nRead the full case study here:\nhttps://nexdesk.agency/work\n\nHave a project in mind? Reply to this email and let's talk.\n\nWarmly,\nNex Desk Team`,
  },
  {
    key: "service_offer",
    title: "Special Service Announcement",
    subject: "Accelerate your product launch with Nex Desk software engineering",
    body: `Hi {{client_name}},\n\nAre you looking to build a web application, mobile app, or modern backend platform?\n\nOur team specializes in fast, production-ready software development using Next.js, React, Node.js, and cloud infrastructure.\n\nBook a strategy call or request a quote today:\nhttps://nexdesk.agency/contact\n\nBest regards,\nNex Desk Team`,
  },
];

export default function BroadcastModal({ subscribers, isOpen, onClose }: BroadcastModalProps) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<"all" | "selected">("all");
  const [selectedEmails, setSelectedEmails] = useState<string[]>(subscribers.map((s) => s.email));
  const [selectedTemplate, setSelectedTemplate] = useState("agency_update");
  const [subject, setSubject] = useState(TEMPLATE_PRESETS[0].subject);
  const [body, setBody] = useState(TEMPLATE_PRESETS[0].body);

  if (!isOpen) return null;

  const handleTemplateChange = (key: string) => {
    setSelectedTemplate(key);
    const found = TEMPLATE_PRESETS.find((t) => t.key === key);
    if (found) {
      setSubject(found.subject);
      setBody(found.body);
    }
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const activeSubscribers = subscribers.filter((s) => s.is_active);
  const recipients = target === "all" ? activeSubscribers.map((s) => s.email) : selectedEmails;

  const handleSend = () => {
    if (!recipients.length) {
      toast.error("Please select at least one recipient.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body cannot be empty.");
      return;
    }

    startTransition(async () => {
      let sentCount = 0;
      let failCount = 0;

      for (const email of recipients) {
        try {
          const res = await sendClientEmail({
            templateKey: "newsletter_broadcast",
            to: email,
            subject: subject.replace("{{client_name}}", email.split("@")[0]),
            body: body.replace("{{client_name}}", email.split("@")[0]),
          });
          if (res.ok) sentCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }

      toast.success(`Newsletter broadcast sent! Successfully sent: ${sentCount}, Failed: ${failCount}`);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="card w-full max-w-2xl p-6 sm:p-8 text-left bg-ink-900 border-ink-600 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-600 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-400/10 text-lime-400">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-bone-50">Send Newsletter Broadcast</h2>
              <p className="text-xs text-bone-400">Compose and dispatch emails to your subscribers</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-bone-400 hover:text-bone-100">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {/* Target Audience */}
          <div>
            <label className="mono-tag text-xs mb-2 block">1. Select Audience</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTarget("all")}
                className={`flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-colors ${
                  target === "all"
                    ? "border-lime-400 bg-lime-400/10 text-bone-50 font-medium"
                    : "border-ink-600 bg-ink-800/60 text-bone-300 hover:border-ink-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={16} className={target === "all" ? "text-lime-400" : "text-bone-400"} />
                  <span>All Active ({activeSubscribers.length})</span>
                </div>
                {target === "all" && <CheckCircle2 size={16} className="text-lime-400" />}
              </button>

              <button
                type="button"
                onClick={() => setTarget("selected")}
                className={`flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-colors ${
                  target === "selected"
                    ? "border-lime-400 bg-lime-400/10 text-bone-50 font-medium"
                    : "border-ink-600 bg-ink-800/60 text-bone-300 hover:border-ink-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} className={target === "selected" ? "text-lime-400" : "text-bone-400"} />
                  <span>Select Specific ({selectedEmails.length})</span>
                </div>
                {target === "selected" && <CheckCircle2 size={16} className="text-lime-400" />}
              </button>
            </div>

            {target === "selected" && (
              <div className="mt-3 max-h-32 overflow-y-auto border border-ink-600 rounded-lg p-2.5 bg-ink-800/40 divide-y divide-ink-700/60 space-y-1">
                {activeSubscribers.map((sub) => (
                  <label key={sub.id} className="flex items-center justify-between text-xs text-bone-200 py-1 px-1 cursor-pointer">
                    <span className="truncate">{sub.email}</span>
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(sub.email)}
                      onChange={() => toggleEmail(sub.email)}
                      className="accent-[color:var(--color-lime-400)]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Template Presets */}
          <div>
            <label className="mono-tag text-xs mb-2 block">2. Select Email Template</label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATE_PRESETS.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => handleTemplateChange(tpl.key)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    selectedTemplate === tpl.key
                      ? "border-lime-400 bg-lime-400/10 text-bone-50 font-medium"
                      : "border-ink-600 bg-ink-800/40 text-bone-400 hover:text-bone-200"
                  }`}
                >
                  <Sparkles size={14} className="mb-1 text-lime-400" />
                  <p className="font-medium truncate">{tpl.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Subject & Body */}
          <div className="space-y-3">
            <div>
              <label className="mono-tag text-xs mb-1 block">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mono-tag text-xs mb-1 block">Email Message Body (Markdown / Plain Text)</label>
              <textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-lg border border-ink-500 bg-ink-800 p-3 text-sm text-bone-50 focus:border-lime-400 focus:outline-none font-mono text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between border-t border-ink-600 pt-4">
          <p className="text-xs text-bone-400">
            Recipients: <strong className="text-lime-400">{recipients.length} subscriber(s)</strong>
          </p>

          <div className="flex gap-2">
            <button className="btn h-9 px-4 text-xs" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2"
              onClick={handleSend}
              disabled={pending || !recipients.length}
            >
              <Send size={14} />
              {pending ? "Sending Broadcast..." : `Send to ${recipients.length} Recipients`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
