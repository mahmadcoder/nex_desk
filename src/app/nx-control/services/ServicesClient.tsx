"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveService, deleteService } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3, DollarSign, Layers } from "lucide-react";

interface Service {
  id: string;
  slug: string;
  title: string;
  category: string;
  short_desc: string | null;
  starting_at: number | null;
  currency: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function ServicesClient({ services }: { services: Service[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<Service> | null>(null);

  const handleSave = () => {
    if (!editing?.title || !editing?.slug || !editing?.category) {
      toast.error("Title, Slug and Category are required.");
      return;
    }

    startTransition(async () => {
      try {
        await saveService(editing.id ?? null, {
          title: editing.title,
          slug: (editing.slug || "").toLowerCase().replace(/[^\w-]/g, "-"),
          category: editing.category,
          short_desc: editing.short_desc ?? null,
          starting_at: editing.starting_at ? Number(editing.starting_at) : null,
          currency: editing.currency ?? "PKR",
          is_featured: editing.is_featured ?? false,
          is_active: editing.is_active ?? true,
          sort_order: editing.sort_order ?? 0,
        });
        toast.success(editing.id ? "Service updated." : "Service created.");
        setEditing(null);
        router.refresh();
      } catch {
        toast.error("Failed to save service.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this service?")) return;
    startTransition(async () => {
      try {
        await deleteService(id);
        toast.success("Service deleted.");
        router.refresh();
      } catch {
        toast.error("Failed to delete service.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-ink-600 pb-6">
        <div>
          <span className="mono-tag text-lime-400">Services Catalogue</span>
          <h1 className="mt-1 text-2xl font-semibold text-bone-50">Agency Services ({services.length})</h1>
          <p className="mt-1 text-xs text-bone-400">Manage service catalogue offerings, categories, and starting prices</p>
        </div>

        <button
          onClick={() =>
            setEditing({
              title: "",
              slug: "",
              category: "Web Development",
              short_desc: "",
              starting_at: 100000,
              currency: "PKR",
              is_featured: false,
              is_active: true,
              sort_order: 0,
            })
          }
          className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2"
        >
          <Plus size={14} /> Add Service
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.id} className="card p-5 border-ink-600 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded">
                  {s.category}
                </span>
                <span className="font-mono text-xs text-lime-400 font-semibold">
                  From {s.currency || "PKR"} {Number(s.starting_at ?? 0).toLocaleString()}
                </span>
              </div>

              <h3 className="mt-3 text-base font-semibold text-bone-50">{s.title}</h3>
              {s.short_desc && <p className="mt-2 text-xs text-bone-300 line-clamp-2">{s.short_desc}</p>}
            </div>

            <div className="border-t border-ink-700/60 pt-3 flex items-center justify-between">
              <span className="text-[11px] font-mono text-bone-400">/{s.slug}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(s)}
                  className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-800"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-lg p-6 bg-ink-900 border-ink-600" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-bone-50 mb-4">
              {editing.id ? "Edit Service" : "New Service"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mono-tag text-xs mb-1 block">Service Title *</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.title ?? ""}
                  onChange={(e) => {
                    const title = e.target.value;
                    const slug = title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
                    setEditing({ ...editing, title, slug: editing.id ? editing.slug : slug });
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono-tag text-xs mb-1 block">URL Slug *</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none font-mono text-xs"
                    value={editing.slug ?? ""}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Category *</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                    value={editing.category ?? ""}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono-tag text-xs mb-1 block">Starting Price</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none font-mono"
                    value={editing.starting_at ?? 0}
                    onChange={(e) => setEditing({ ...editing, starting_at: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Currency</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                    value={editing.currency ?? "PKR"}
                    onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Short Description</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 p-2.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.short_desc ?? ""}
                  onChange={(e) => setEditing({ ...editing, short_desc: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-300">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? true}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="accent-[color:var(--color-lime-400)]"
                  />
                  <span>Active & Visible</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn h-9 px-4 text-xs" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-xs" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : "Save Service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
