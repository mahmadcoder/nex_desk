"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveFaq, deleteFaq, toggleFaqActive, seedDefaultFaqs } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3, Eye, EyeOff, RefreshCw } from "lucide-react";
import { PageHead } from "@/components/admin/ui";

import { IFaq } from "@/types/cms";

export default function FaqsClient({ faqs }: { faqs: IFaq[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<IFaq> | null>(null);

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleFaqActive(id, !currentStatus);
        toast.success(!currentStatus ? "FAQ activated and visible on site." : "FAQ hidden from website.");
        router.refresh();
      } catch {
        toast.error("Failed to update status.");
      }
    });
  };

  const handleSeed = () => {
    if (!confirm("Seed default FAQs into Supabase database?")) return;
    startTransition(async () => {
      try {
        const res = await seedDefaultFaqs();
        toast.success(`Successfully seeded ${res.count} FAQs into database!`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to seed FAQs.");
      }
    });
  };

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
          category: editing.category ?? "General",
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
    <div className="space-y-6">
      <PageHead
        title={`Frequently Asked Questions (${faqs.length})`}
        sub="Manage client questions and answers displayed on the website FAQ sections."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={pending}
              className="btn bg-ink-800 text-bone-200 hover:text-bone-50 border-ink-600 h-9 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={pending ? "animate-spin" : ""} /> Seed FAQs to DB
            </button>
            <button
              onClick={() =>
                setEditing({
                  question: "",
                  answer: "",
                  category: "General",
                  sort_order: faqs.length + 1,
                  is_active: true,
                })
              }
              className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} /> Add FAQ
            </button>
          </div>
        }
      />

      <div className="space-y-3">
        {faqs.map((f) => (
          <div
            key={f.id}
            className={`card p-5 border-ink-600 flex items-start justify-between gap-4 transition-opacity ${
              f.is_active ? "bg-ink-900/80 border-ink-600" : "bg-ink-950/60 border-ink-700/50 opacity-65"
            }`}
          >
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/20">
                  {f.category || "General"}
                </span>

                <button
                  onClick={() => handleToggleActive(f.id, f.is_active)}
                  disabled={pending}
                  className={`mono-tag text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    f.is_active
                      ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/20"
                      : "bg-rose-400/10 text-rose-400 border border-rose-400/30 hover:bg-rose-400/20"
                  }`}
                >
                  {f.is_active ? (
                    <>
                      <Eye size={11} /> Active
                    </>
                  ) : (
                    <>
                      <EyeOff size={11} /> Hidden
                    </>
                  )}
                </button>
              </div>

              <h3 className="text-sm font-semibold text-bone-50 pt-1">{f.question}</h3>
              <p className="text-xs text-bone-300 leading-relaxed">{f.answer}</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setEditing(f)}
                className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800 cursor-pointer"
                title="Edit FAQ"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => handleDelete(f.id)}
                className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-800 cursor-pointer"
                title="Delete FAQ"
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
            <h2 className="text-lg font-semibold text-bone-50 mb-4 border-b border-ink-700/80 pb-3">
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
                  placeholder="e.g. General, Pricing, Delivery"
                  value={editing.category ?? "General"}
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

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-200">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? true}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="accent-[color:var(--color-lime-400)] h-4 w-4"
                  />
                  <span className="font-medium">Active on Public Website</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-ink-700/80 pt-4">
              <button className="btn h-9 px-4 text-xs cursor-pointer" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-xs cursor-pointer" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : "Save FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
