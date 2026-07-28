"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveFaq, deleteFaq, toggleFaqActive, seedDefaultFaqs } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3, Eye, EyeOff, RefreshCw, X } from "lucide-react";
import { PageHead } from "@/components/admin/ui";
import { IFaq } from "@/types/cms";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect, { SelectOption } from "@/components/ui/CustomSelect";

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "General", label: "General Questions" },
  { value: "Pricing & Investment", label: "Pricing & Investment" },
  { value: "Delivery & Timelines", label: "Delivery & Timelines" },
  { value: "Scope & Change Orders", label: "Scope & Change Orders" },
  { value: "Code & IP Ownership", label: "Code & IP Ownership" },
  { value: "Technical & Security", label: "Technical & Security Architecture" },
  { value: "Post-Launch Support", label: "Post-Launch Support & Warranty" },
  { value: "custom", label: "+ Custom Category..." },
];

export default function FaqsClient({ faqs }: { faqs: IFaq[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<IFaq> | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seedingConfirm, setSeedingConfirm] = useState(false);

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
    setSeedingConfirm(false);
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
        setIsCustomCategory(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to save FAQ.");
      }
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    const targetId = deletingId;
    startTransition(async () => {
      try {
        await deleteFaq(targetId);
        toast.success("FAQ deleted.");
        setDeletingId(null);
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
              onClick={() => setSeedingConfirm(true)}
              disabled={pending}
              className="btn bg-ink-800 text-bone-200 hover:text-bone-50 border-ink-600 h-9 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={pending ? "animate-spin" : ""} /> Seed FAQs to DB
            </button>
            <button
              onClick={() => {
                setIsCustomCategory(false);
                setEditing({
                  question: "",
                  answer: "",
                  category: "General",
                  sort_order: faqs.length + 1,
                  is_active: true,
                });
              }}
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
                <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded border border-lime-400/20">
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
                onClick={() => {
                  const currentCat = f.category || "General";
                  const isStandard = CATEGORY_OPTIONS.some((opt) => opt.value === currentCat);
                  setIsCustomCategory(!isStandard);
                  setEditing(f);
                }}
                className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800 cursor-pointer"
                title="Edit FAQ"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => setDeletingId(f.id)}
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="card w-full max-w-lg p-6 bg-ink-900 border-ink-600 relative space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title and X Close Icon */}
            <div className="flex items-center justify-between border-b border-ink-700/80 pb-3">
              <h2 className="text-lg font-semibold text-bone-50">
                {editing.id ? "Edit FAQ" : "New FAQ"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg text-bone-400 hover:text-bone-50 hover:bg-ink-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mono-tag text-xs mb-1 block">Question *</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="e.g. How fast can you complete my project?"
                  value={editing.question ?? ""}
                  onChange={(e) => setEditing({ ...editing, question: e.target.value })}
                />
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Category</label>
                <CustomSelect
                  options={CATEGORY_OPTIONS}
                  value={isCustomCategory ? "custom" : (editing.category || "General")}
                  onChange={(val) => {
                    if (val === "custom") {
                      setIsCustomCategory(true);
                      setEditing({ ...editing, category: "" });
                    } else {
                      setIsCustomCategory(false);
                      setEditing({ ...editing, category: val });
                    }
                  }}
                  placeholder="Select Category..."
                />

                {isCustomCategory && (
                  <input
                    className="mt-2.5 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none animate-in fade-in duration-150"
                    placeholder="Type custom category name..."
                    value={editing.category ?? ""}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  />
                )}
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Answer *</label>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 p-3 text-sm text-bone-50 focus:border-lime-400 focus:outline-none leading-relaxed"
                  placeholder="Write clear, transparent answer..."
                  value={editing.answer ?? ""}
                  onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
                />
              </div>

              <div className="pt-1">
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
              <button
                type="button"
                className="btn h-9 px-4 text-xs cursor-pointer"
                onClick={() => setEditing(null)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary h-9 px-4 text-xs cursor-pointer"
                onClick={handleSave}
                disabled={pending}
              >
                {pending ? "Saving..." : "Save FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Frequently Asked Question?"
        description="Are you sure you want to delete this FAQ? It will be permanently removed from your database and public website."
        confirmText="Delete FAQ"
        pending={pending}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />

      {/* Seed Confirmation Modal */}
      <ConfirmModal
        isOpen={seedingConfirm}
        title="Seed Default FAQs to Database?"
        description="This will insert default agency FAQs into your Supabase database so you can manage them directly."
        confirmText="Seed FAQs"
        isDanger={false}
        pending={pending}
        onConfirm={handleSeed}
        onClose={() => setSeedingConfirm(false)}
      />
    </div>
  );
}
