"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCaseStudy, deleteCaseStudy, toggleCaseStudyPublished, seedDefaultCaseStudies } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3, X, Tag, Eye, EyeOff, RefreshCw } from "lucide-react";
import { PageHead } from "@/components/admin/ui";
import ImageUpload from "@/components/admin/ImageUpload";
import { ICaseStudy } from "@/types/cms";
import ConfirmModal from "@/components/admin/ConfirmModal";

export default function WorkClient({ caseStudies }: { caseStudies: ICaseStudy[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<ICaseStudy> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seedingConfirm, setSeedingConfirm] = useState(false);

  const [techInput, setTechInput] = useState("");
  const [serviceInput, setServiceInput] = useState("");

  const handleTogglePublished = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleCaseStudyPublished(id, !currentStatus);
        toast.success(!currentStatus ? "Project published live on website." : "Project hidden from website.");
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
        const res = await seedDefaultCaseStudies();
        toast.success(`Successfully seeded ${res.count} projects into database!`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to seed case studies.");
      }
    });
  };

  const handleSave = () => {
    if (!editing?.title || !editing?.slug) {
      toast.error("Title and URL Slug are required.");
      return;
    }

    startTransition(async () => {
      try {
        await saveCaseStudy(editing.id ?? null, {
          title: editing.title,
          slug: (editing.slug || "").toLowerCase().replace(/[^\w-]/g, "-"),
          client_name: editing.client_name ?? null,
          industry: editing.industry ?? null,
          cover_url: editing.cover_url ?? null,
          challenge: editing.challenge ?? null,
          solution: editing.solution ?? null,
          outcome: editing.outcome ?? null,
          metrics: editing.metrics ?? [],
          tech_stack: editing.tech_stack ?? [],
          services: editing.services ?? [],
          live_url: editing.live_url ?? null,
          is_featured: editing.is_featured ?? false,
          is_published: editing.is_published ?? true,
          sort_order: editing.sort_order ?? 0,
        });
        toast.success(editing.id ? "Case study updated." : "Case study created.");
        setEditing(null);
        router.refresh();
      } catch {
        toast.error("Failed to save case study.");
      }
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    const targetId = deletingId;
    startTransition(async () => {
      try {
        await deleteCaseStudy(targetId);
        toast.success("Case study deleted.");
        setDeletingId(null);
        router.refresh();
      } catch {
        toast.error("Failed to delete case study.");
      }
    });
  };

  const addMetric = () => {
    const list = editing?.metrics || [];
    setEditing({ ...editing, metrics: [...list, { label: "", value: "" }] });
  };

  const updateMetric = (index: number, key: "label" | "value", val: string) => {
    const list = [...(editing?.metrics || [])];
    list[index] = { ...list[index], [key]: val };
    setEditing({ ...editing, metrics: list });
  };

  const removeMetric = (index: number) => {
    const list = (editing?.metrics || []).filter((_, i) => i !== index);
    setEditing({ ...editing, metrics: list });
  };

  const addTechTag = () => {
    if (!techInput.trim()) return;
    const list = editing?.tech_stack || [];
    if (!list.includes(techInput.trim())) {
      setEditing({ ...editing, tech_stack: [...list, techInput.trim()] });
    }
    setTechInput("");
  };

  const removeTechTag = (tag: string) => {
    const list = (editing?.tech_stack || []).filter((t) => t !== tag);
    setEditing({ ...editing, tech_stack: list });
  };

  const addServiceTag = () => {
    if (!serviceInput.trim()) return;
    const list = editing?.services || [];
    if (!list.includes(serviceInput.trim())) {
      setEditing({ ...editing, services: [...list, serviceInput.trim()] });
    }
    setServiceInput("");
  };

  const removeServiceTag = (tag: string) => {
    const list = (editing?.services || []).filter((s) => s !== tag);
    setEditing({ ...editing, services: list });
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={`Case Studies & Work (${caseStudies.length})`}
        sub="Manage agency portfolio projects, metrics, tech stack, and homepage showcase items."
        action={
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:w-auto w-full">
            <button
              onClick={() => setSeedingConfirm(true)}
              disabled={pending}
              className="btn bg-ink-800 text-bone-200 hover:text-bone-50 border-ink-600 min-h-[36px] h-auto py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw size={13} className={pending ? "animate-spin" : ""} /> Seed Projects to DB
            </button>
            <button
              onClick={() =>
                setEditing({
                  title: "",
                  slug: "",
                  client_name: "",
                  industry: "Web Application",
                  cover_url: "",
                  challenge: "",
                  solution: "",
                  outcome: "",
                  metrics: [],
                  tech_stack: [],
                  services: [],
                  live_url: "",
                  is_featured: true,
                  is_published: true,
                  sort_order: caseStudies.length + 1,
                })
              }
              className="btn btn-primary min-h-[36px] h-auto py-2 px-4 text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={14} /> Add Case Study
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {caseStudies.map((c) => (
          <div
            key={c.id}
            className={`card p-5 border-ink-600 flex flex-col justify-between space-y-4 transition-opacity ${
              c.is_published ? "bg-ink-900/80 border-ink-600" : "bg-ink-950/60 border-ink-700/50 opacity-65"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded-full border border-lime-400/20">
                  {c.industry || "Case Study"}
                </span>

                <button
                  onClick={() => handleTogglePublished(c.id, c.is_published)}
                  disabled={pending}
                  className={`mono-tag text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    c.is_published
                      ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/20"
                      : "bg-rose-400/10 text-rose-400 border border-rose-400/30 hover:bg-rose-400/20"
                  }`}
                >
                  {c.is_published ? (
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

              {c.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.cover_url}
                  alt={c.title}
                  className="mt-3 h-36 w-full rounded-lg object-cover border border-ink-700"
                />
              )}

              <h3 className="mt-3 text-base font-semibold text-bone-50">{c.title}</h3>
              {c.client_name && <p className="text-xs text-bone-400 mt-0.5">Client: {c.client_name}</p>}
              {c.outcome && <p className="mt-2 text-xs text-bone-300 line-clamp-2 leading-relaxed">{c.outcome}</p>}

              {!!(c.tech_stack ?? []).length && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {(c.tech_stack ?? []).slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] bg-ink-800 text-bone-400 px-2 py-0.5 rounded border border-ink-700/60">
                      {t}
                    </span>
                  ))}
                  {(c.tech_stack ?? []).length > 4 && (
                    <span className="text-[10px] text-bone-500">+{c.tech_stack!.length - 4} more</span>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-ink-700/60 pt-3 flex items-center justify-between">
              <span className="text-[11px] font-mono text-bone-400">/{c.slug}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(c)}
                  className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800 cursor-pointer"
                  title="Edit project"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => setDeletingId(c.id)}
                  className="p-1.5 rounded text-bone-400 hover:text-rose-400 hover:bg-ink-800 cursor-pointer"
                  title="Delete project"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="card w-full max-w-2xl p-6 sm:p-8 bg-ink-900 border-ink-600 my-8 space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-700/80 pb-3">
              <h2 className="text-lg font-semibold text-bone-50">
                {editing.id ? "Edit Case Study" : "New Case Study"}
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

            <ImageUpload
              label="Case Study Cover Image"
              value={editing.cover_url ?? ""}
              onChange={(url) => setEditing({ ...editing, cover_url: url })}
              folder="work-covers"
            />

            <div>
              <label className="mono-tag text-xs mb-1 block">Project Title *</label>
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

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="mono-tag text-xs mb-1 block">URL Slug *</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none font-mono text-xs"
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="mono-tag text-xs mb-1 block">Client Name</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.client_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, client_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="mono-tag text-xs mb-1 block">Industry</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="e.g. Fintech, SaaS, E-Commerce"
                  value={editing.industry ?? ""}
                  onChange={(e) => setEditing({ ...editing, industry: e.target.value })}
                />
              </div>
              <div>
                <label className="mono-tag text-xs mb-1 block">Live Project URL</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none font-mono text-xs"
                  placeholder="https://..."
                  value={editing.live_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, live_url: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mono-tag text-xs mb-1 block">Key Outcome / Subtitle Summary</label>
              <input
                className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                placeholder="e.g. Scaled platform to 45,000 MAU with 99.99% uptime."
                value={editing.outcome ?? ""}
                onChange={(e) => setEditing({ ...editing, outcome: e.target.value })}
              />
            </div>

            {/* Tech Stack Tags Builder */}
            <div>
              <label className="mono-tag text-xs mb-1 block">Tech Stack Tags (Built With)</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  className="flex-1 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="Type tech (e.g. Next.js, Supabase) & press Add"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTechTag())}
                />
                <button type="button" onClick={addTechTag} className="btn btn-primary h-8 px-3 text-xs cursor-pointer">
                  Add Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(editing.tech_stack || []).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800 px-3 py-1 text-xs text-bone-200">
                    <Tag size={12} className="text-lime-400" />
                    {t}
                    <button type="button" onClick={() => removeTechTag(t)} className="text-bone-400 hover:text-rose-400">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Metrics Builder */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="mono-tag text-xs">Project Key Metrics</label>
                <button type="button" onClick={addMetric} className="text-xs text-lime-400 hover:underline cursor-pointer">
                  + Add Metric Pair
                </button>
              </div>
              <div className="space-y-2">
                {(editing.metrics || []).map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                      placeholder="Metric Value (e.g. +240%)"
                      value={m.value}
                      onChange={(e) => updateMetric(idx, "value", e.target.value)}
                    />
                    <input
                      className="flex-1 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                      placeholder="Metric Label (e.g. Revenue Growth)"
                      value={m.label}
                      onChange={(e) => updateMetric(idx, "label", e.target.value)}
                    />
                    <button type="button" onClick={() => removeMetric(idx)} className="p-1 text-bone-400 hover:text-rose-400">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-200">
                <input
                  type="checkbox"
                  checked={editing.is_published ?? true}
                  onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                  className="accent-[color:var(--color-lime-400)] h-4 w-4"
                />
                <span className="font-medium">Publish Live on Website</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-200">
                <input
                  type="checkbox"
                  checked={editing.is_featured ?? true}
                  onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
                  className="accent-[color:var(--color-lime-400)] h-4 w-4"
                />
                <span className="font-medium">Feature on Homepage</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-ink-700/80 pt-4">
              <button className="btn h-9 px-4 text-xs cursor-pointer" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-xs cursor-pointer" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : editing.id ? "Update Case Study" : "Save Case Study"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Case Study Project?"
        description="Are you sure you want to delete this case study? It will be permanently removed from your portfolio and live website."
        confirmText="Delete Project"
        pending={pending}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />

      {/* Seed Confirmation Modal */}
      <ConfirmModal
        isOpen={seedingConfirm}
        title="Seed Default Case Studies to Database?"
        description="This will insert default portfolio projects into your Supabase database."
        confirmText="Seed Projects"
        isDanger={false}
        pending={pending}
        onConfirm={handleSeed}
        onClose={() => setSeedingConfirm(false)}
      />
    </div>
  );
}
