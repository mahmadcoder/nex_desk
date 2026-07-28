"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveTestimonial, deleteTestimonial, toggleTestimonialPublished, seedDefaultTestimonials } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3, Star, Eye, EyeOff, RefreshCw, X } from "lucide-react";
import { PageHead } from "@/components/admin/ui";
import { ITestimonial } from "@/types/cms";
import ConfirmModal from "@/components/admin/ConfirmModal";

export default function TestimonialsClient({ testimonials }: { testimonials: ITestimonial[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<ITestimonial> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seedingConfirm, setSeedingConfirm] = useState(false);

  const handleTogglePublished = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleTestimonialPublished(id, !currentStatus);
        toast.success(!currentStatus ? "Testimonial published live." : "Testimonial hidden from website.");
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
        const res = await seedDefaultTestimonials();
        toast.success(`Successfully seeded ${res.count} testimonials into database!`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to seed testimonials.");
      }
    });
  };

  const handleSave = () => {
    if (!editing?.client_name || !editing?.quote) {
      toast.error("Client name and quote are required.");
      return;
    }

    startTransition(async () => {
      try {
        await saveTestimonial(editing.id ?? null, {
          client_name: editing.client_name,
          role: editing.role ?? null,
          company: editing.company ?? null,
          avatar_url: editing.avatar_url ?? null,
          quote: editing.quote,
          rating: editing.rating ?? 5,
          is_published: editing.is_published ?? true,
          sort_order: editing.sort_order ?? 0,
        });
        toast.success(editing.id ? "Testimonial updated." : "Testimonial created.");
        setEditing(null);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to save testimonial.");
      }
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    const targetId = deletingId;
    startTransition(async () => {
      try {
        await deleteTestimonial(targetId);
        toast.success("Testimonial deleted.");
        setDeletingId(null);
        router.refresh();
      } catch {
        toast.error("Failed to delete testimonial.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={`Client Testimonials (${testimonials.length})`}
        sub="Manage client reviews and star ratings displayed on the website Testimonial Wall."
        action={
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:w-auto w-full">
            <button
              onClick={() => setSeedingConfirm(true)}
              disabled={pending}
              className="btn bg-ink-800 text-bone-200 hover:text-bone-50 border-ink-600 min-h-[36px] h-auto py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw size={13} className={pending ? "animate-spin" : ""} /> Seed Testimonials to DB
            </button>
            <button
              onClick={() =>
                setEditing({
                  client_name: "",
                  role: "",
                  company: "",
                  avatar_url: "",
                  quote: "",
                  rating: 5,
                  is_published: true,
                  sort_order: testimonials.length + 1,
                })
              }
              className="btn btn-primary min-h-[36px] h-auto py-2 px-4 text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={14} /> Add Testimonial
            </button>
          </div>
        }
      />

      {/* Grid of Testimonials */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className={`card p-5 border-ink-600 flex flex-col justify-between space-y-4 transition-opacity ${
              t.is_published ? "bg-ink-900/80 border-ink-600" : "bg-ink-950/60 border-ink-700/50 opacity-65"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>

                <button
                  onClick={() => handleTogglePublished(t.id, t.is_published)}
                  disabled={pending}
                  className={`mono-tag text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    t.is_published
                      ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/20"
                      : "bg-rose-400/10 text-rose-400 border border-rose-400/30 hover:bg-rose-400/20"
                  }`}
                >
                  {t.is_published ? (
                    <>
                      <Eye size={11} /> Published
                    </>
                  ) : (
                    <>
                      <EyeOff size={11} /> Hidden
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3 text-xs text-bone-200 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            </div>

            <div className="border-t border-ink-700/60 pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-bone-50">{t.client_name}</p>
                <p className="text-[11px] text-bone-400">
                  {[t.role, t.company].filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(t)}
                  className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800 transition-colors cursor-pointer"
                  title="Edit testimonial"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => setDeletingId(t.id)}
                  className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-800 transition-colors cursor-pointer"
                  title="Delete testimonial"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="card w-full max-w-lg p-6 bg-ink-900 border-ink-600 relative space-y-4 shadow-2xl my-auto max-h-[90vh] overflow-y-auto custom-admin-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-700/80 pb-3">
              <h2 className="text-lg font-semibold text-bone-50">
                {editing.id ? "Edit Testimonial" : "New Testimonial"}
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

            <div className="space-y-3">
              <div>
                <label className="mono-tag text-xs mb-1 block">Client Name *</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.client_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, client_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono-tag text-xs mb-1 block">Role / Title</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                    placeholder="e.g. CEO, Founder"
                    value={editing.role ?? ""}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Company</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                    placeholder="e.g. TechCorp"
                    value={editing.company ?? ""}
                    onChange={(e) => setEditing({ ...editing, company: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Quote / Review *</label>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 p-3 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.quote ?? ""}
                  onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono-tag text-xs mb-1 block">Rating (1 to 5 Stars)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                    value={editing.rating ?? 5}
                    onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-200">
                    <input
                      type="checkbox"
                      checked={editing.is_published ?? true}
                      onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                      className="accent-[color:var(--color-lime-400)] h-4 w-4"
                    />
                    <span className="font-medium">Publish Live on Website</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-ink-700/80 pt-4">
              <button className="btn h-9 px-4 text-xs cursor-pointer" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-xs cursor-pointer" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : "Save Testimonial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Testimonial?"
        description="Are you sure you want to delete this testimonial? It will be removed from your database and website."
        confirmText="Delete Testimonial"
        pending={pending}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />

      {/* Seed Confirmation Modal */}
      <ConfirmModal
        isOpen={seedingConfirm}
        title="Seed Default Testimonials to Database?"
        description="This will insert default client testimonials into your Supabase database."
        confirmText="Seed Testimonials"
        isDanger={false}
        pending={pending}
        onConfirm={handleSeed}
        onClose={() => setSeedingConfirm(false)}
      />
    </div>
  );
}
