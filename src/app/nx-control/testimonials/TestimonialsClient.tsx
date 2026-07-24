"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveTestimonial, deleteTestimonial } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3, Star, CheckCircle, XCircle } from "lucide-react";

interface Testimonial {
  id: string;
  client_name: string;
  role: string | null;
  company: string | null;
  avatar_url: string | null;
  quote: string;
  rating: number | null;
  is_published: boolean;
  sort_order: number;
}

export default function TestimonialsClient({ testimonials }: { testimonials: Testimonial[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<Testimonial> | null>(null);

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
      } catch {
        toast.error("Failed to save testimonial.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    startTransition(async () => {
      try {
        await deleteTestimonial(id);
        toast.success("Testimonial deleted.");
        router.refresh();
      } catch {
        toast.error("Failed to delete testimonial.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-ink-600 pb-6">
        <div>
          <span className="mono-tag text-lime-400">CMS Content</span>
          <h1 className="mt-1 text-2xl font-semibold text-bone-50">Client Testimonials ({testimonials.length})</h1>
          <p className="mt-1 text-xs text-bone-400">Manage client reviews displayed on the website homepage</p>
        </div>

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
              sort_order: 0,
            })
          }
          className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2"
        >
          <Plus size={14} /> Add Testimonial
        </button>
      </div>

      {/* Grid of Testimonials */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <div key={t.id} className="card p-5 border-ink-600 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                {t.is_published ? (
                  <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded">
                    Published
                  </span>
                ) : (
                  <span className="mono-tag text-[10px] text-bone-500 bg-ink-800 px-2 py-0.5 rounded">
                    Draft
                  </span>
                )}
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
                  className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800 transition-colors"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-800 transition-colors"
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-lg p-6 bg-ink-900 border-ink-600" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-bone-50 mb-4">
              {editing.id ? "Edit Testimonial" : "New Testimonial"}
            </h2>

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
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-300">
                    <input
                      type="checkbox"
                      checked={editing.is_published ?? true}
                      onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                      className="accent-[color:var(--color-lime-400)]"
                    />
                    <span>Publish publicly on website</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn h-9 px-4 text-xs" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-xs" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : "Save Testimonial"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
