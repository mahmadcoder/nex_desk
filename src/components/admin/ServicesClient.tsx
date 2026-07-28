"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveService, deleteService, toggleServiceActive, seedDefaultServices } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3, Eye, EyeOff, RefreshCw, DollarSign, Layers, X } from "lucide-react";
import { PageHead } from "@/components/admin/ui";

import { IService } from "@/types/cms";

export default function ServicesClient({ services }: { services: IService[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<IService> | null>(null);

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleServiceActive(id, !currentStatus);
        toast.success(!currentStatus ? "Service activated and visible on site." : "Service deactivated and hidden from site.");
        router.refresh();
      } catch {
        toast.error("Failed to update status.");
      }
    });
  };

  const handleSeed = () => {
    if (!confirm("Seed all 16 default agency services into Supabase database?")) return;
    startTransition(async () => {
      try {
        const res = await seedDefaultServices();
        toast.success(`Successfully seeded ${res.count} services into database!`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to seed services.");
      }
    });
  };

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
          currency: editing.currency ?? "USD",
          is_featured: editing.is_featured ?? true,
          is_active: editing.is_active ?? true,
          sort_order: editing.sort_order ?? 0,
          pricing_tiers: editing.pricing_tiers || [
            {
              key: "basic",
              name: "Starter Package",
              price: editing.starting_at || 1500,
              price_label: editing.starting_at ? `$${editing.starting_at.toLocaleString()}` : "$1,500",
              short_desc: "Essential build for startups & single core product launch.",
              delivery_time: "1–2 weeks delivery",
              features: [
                "Core feature build & responsive design",
                "Sub-second page load performance",
                "Mobile & Desktop optimization",
                "100% Code & Asset ownership",
                "2 weeks post-launch support",
              ],
              is_popular: false,
              cta_text: "Select Starter Package",
            },
            {
              key: "standard",
              name: "Growth Package",
              price: (editing.starting_at || 1500) * 2,
              price_label: `$${((editing.starting_at || 1500) * 2).toLocaleString()}`,
              short_desc: "Complete production application with advanced features & integrations.",
              delivery_time: "2–4 weeks delivery",
              features: [
                "Everything in Starter Package",
                "Custom database & authentication integration",
                "Advanced admin control panel & dashboard",
                "GA4 Analytics & SEO optimization",
                "Priority API & webhook pipelines",
                "30 days dedicated warranty support",
              ],
              is_popular: true,
              cta_text: "Select Growth Package",
            },
            {
              key: "enterprise",
              name: "Enterprise Architecture",
              price: null,
              price_label: "Custom Quote",
              short_desc: "Tailored multi-team architecture, custom SLA, and dedicated engineering squad.",
              delivery_time: "Custom timeline",
              features: [
                "Everything in Growth Package",
                "Dedicated senior lead engineer & designer",
                "Multi-tenant & high-availability DB setup",
                "Security audit & SOC2 compliance prep",
                "Custom SLA & 24/7 emergency retainer",
              ],
              is_popular: false,
              cta_text: "Request Enterprise Quote",
            },
          ],
        });
        toast.success(editing.id ? "Service & prices updated." : "Service created.");
        setEditing(null);
        router.refresh();
      } catch {
        toast.error("Failed to save service.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this service? It will be removed from database and public site.")) return;
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
      <PageHead
        title={`Agency Services (${services.length})`}
        sub="Manage service offerings, active status, starting prices, and tier packages."
        action={
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:w-auto w-full">
            <button
              onClick={handleSeed}
              disabled={pending}
              className="btn bg-ink-800 text-bone-200 hover:text-bone-50 border-ink-600 min-h-[36px] h-auto py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw size={13} className={pending ? "animate-spin" : ""} /> Seed 16 Services to DB
            </button>
            <button
              onClick={() =>
                setEditing({
                  title: "",
                  slug: "",
                  category: "Web & Engineering",
                  short_desc: "",
                  starting_at: 1500,
                  currency: "USD",
                  is_featured: true,
                  is_active: true,
                  sort_order: services.length + 1,
                })
              }
              className="btn btn-primary min-h-[36px] h-auto py-2 px-4 text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={14} /> Add Service
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div
            key={s.id}
            className={`card p-5 border-ink-600 flex flex-col justify-between space-y-4 transition-opacity ${
              s.is_active ? "bg-ink-900/80 border-ink-600" : "bg-ink-950/60 border-ink-700/50 opacity-65"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded-full border border-lime-400/20">
                  {s.category}
                </span>

                <button
                  onClick={() => handleToggleActive(s.id, s.is_active)}
                  disabled={pending}
                  className={`mono-tag text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    s.is_active
                      ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/20"
                      : "bg-rose-400/10 text-rose-400 border border-rose-400/30 hover:bg-rose-400/20"
                  }`}
                >
                  {s.is_active ? (
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

              <h3 className="mt-3 text-base font-semibold text-bone-50">{s.title}</h3>
              {s.short_desc && <p className="mt-1.5 text-xs text-bone-300 line-clamp-2 leading-relaxed">{s.short_desc}</p>}

              <div className="mt-3 pt-3 border-t border-ink-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-bone-400">Starting Price:</span>
                <span className="text-lime-400 font-semibold">
                  {s.starting_at ? `${s.currency === "USD" ? "$" : s.currency || ""}${Number(s.starting_at).toLocaleString()}` : "Custom Quote"}
                </span>
              </div>
            </div>

            <div className="border-t border-ink-700/60 pt-3 flex items-center justify-between">
              <span className="text-[11px] font-mono text-bone-400">/{s.slug}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(s)}
                  className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800 cursor-pointer"
                  title="Edit service & prices"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-800 cursor-pointer"
                  title="Delete service"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="card w-full max-w-xl p-5 sm:p-7 relative bg-ink-900 border-ink-600 my-auto max-h-[90vh] overflow-y-auto custom-admin-scrollbar space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-700/80 pb-3">
              <h2 className="text-lg font-semibold text-bone-50">
                {editing.id ? `Edit ${editing.title}` : "New Agency Service"}
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
                  <label className="mono-tag text-xs mb-1 block">Starting Price ($)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none font-mono"
                    value={editing.starting_at ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      const updatedTiers = (editing.pricing_tiers || []).map((t) => {
                        if (t.key === "basic") return { ...t, price: val, price_label: val ? `$${val.toLocaleString()}` : "Custom Quote" };
                        if (t.key === "standard") return { ...t, price: val ? val * 2 : null, price_label: val ? `$${(val * 2).toLocaleString()}` : "Custom Quote" };
                        return t;
                      });
                      setEditing({ ...editing, starting_at: val, pricing_tiers: updatedTiers.length ? updatedTiers : undefined });
                    }}
                  />
                </div>
                <div>
                  <label className="mono-tag text-xs mb-1 block">Currency Code</label>
                  <input
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none uppercase font-mono"
                    value={editing.currency ?? "USD"}
                    onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mono-tag text-xs mb-1 block">Short Summary Description</label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 p-2.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.short_desc ?? ""}
                  onChange={(e) => setEditing({ ...editing, short_desc: e.target.value })}
                />
              </div>

              <div className="border-t border-ink-700/80 pt-3">
                <span className="mono-tag text-xs text-lime-400 block mb-2">3-Tier Package Pricing Options</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="card p-3 bg-ink-800/80 border-ink-600 text-xs">
                    <p className="font-semibold text-bone-50">Starter Package</p>
                    <p className="text-[11px] font-mono text-lime-400 mt-1">
                      {editing.starting_at ? `$${Number(editing.starting_at).toLocaleString()}` : "Custom Quote"}
                    </p>
                  </div>
                  <div className="card p-3 bg-ink-800/80 border-lime-400/40 text-xs">
                    <p className="font-semibold text-lime-400">Growth Package</p>
                    <p className="text-[11px] font-mono text-bone-100 mt-1">
                      {editing.starting_at ? `$${(Number(editing.starting_at) * 2).toLocaleString()}` : "Custom Quote"}
                    </p>
                  </div>
                  <div className="card p-3 bg-ink-800/80 border-ink-600 text-xs">
                    <p className="font-semibold text-bone-50">Enterprise</p>
                    <p className="text-[11px] font-mono text-bone-400 mt-1">Custom Quote</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
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
                {pending ? "Saving..." : editing.id ? "Update Service" : "Save Service & Prices"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
