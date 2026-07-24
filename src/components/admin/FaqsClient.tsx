"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveFaq, deleteFaq } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3 } from "lucide-react";
import { PageHead } from "@/components/admin/ui";

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function FaqsClient({ faqs }: { faqs: Faq[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);

  const handleSave = () => {
    if (!editing?.question || !editing?.answer) {
      toast.error("Question and Answer are required.");
      return;
    }

    startTransition(async () => {
      try {
        await saveFaq(editing.id ?? null, {
          question: editing.question,
          answer: editing.answer,
          category: editing.category ?? "general",
          sort_order: editing.sort_order ?? 0,
          is_active: editing.is_active ?? true,
        });
        toast.success(editing.id ? "FAQ updated." : "FAQ created.");
        setEditing(null);
        router.refresh();
      } catch {
        toast.error("Failed to save FAQ.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    startTransition(async () => {
      try {
        await deleteFaq(id);
        toast.success("FAQ deleted.");
        router.refresh();
      } catch {
        toast.error("Failed to delete FAQ.");
      }
    });
  };

  return (
    <div>
      <PageHead
        title={`Frequently Asked Questions (${faqs.length})`}
        sub="Manage client questions and answers shown on the website FAQ page."
        action={
          <button
            onClick={() =>
              setEditing({
                question: "",
                answer: "",
                category: "general",
                sort_order: 0,
                is_active: true,
              })
            }
            className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2"
          >
            <Plus size={14} /> Add FAQ
          </button>
        }
      />

      <div className="space-y-3 mt-6">
        {faqs.map((f) => (
          <div key={f.id} className="card p-5 border-ink-600 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded">
                {f.category || "general"}
              </span>
              <h3 className="text-sm font-semibold text-bone-50 pt-1">{f.question}</h3>
              <p className="text-xs text-bone-300 leading-relaxed">{f.answer}</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setEditing(f)}
                className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => handleDelete(f.id)}
                className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-800"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-lg p-6 bg-ink-900 border-ink-600" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-bone-50 mb-4">
              {editing.id ? "Edit FAQ" : "New FAQ"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mono-tag text-xs mb-1 block">Question *</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.question ?? ""}
                  onChange={(e) => setEditing({ ...editing, question: e.target.value })}
                />
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Category</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="e.g. general, pricing, development"
                  value={editing.category ?? "general"}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                />
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Answer *</label>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 p-3 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.answer ?? ""}
                  onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn h-9 px-4 text-xs" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-xs" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : "Save FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
