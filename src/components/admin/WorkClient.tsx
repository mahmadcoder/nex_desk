"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCaseStudy, deleteCaseStudy } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3, X, Tag } from "lucide-react";
import { PageHead } from "@/components/admin/ui";
import ImageUpload from "@/components/admin/ImageUpload";

interface Metric {
  label: string;
  value: string;
}

interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  client_name: string | null;
  industry: string | null;
  cover_url: string | null;
  challenge: string | null;
  solution: string | null;
  outcome: string | null;
  metrics: Metric[] | null;
  tech_stack: string[] | null;
  services: string[] | null;
  live_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
}

export default function WorkClient({ caseStudies }: { caseStudies: CaseStudy[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<CaseStudy> | null>(null);

  const [techInput, setTechInput] = useState("");
  const [serviceInput, setServiceInput] = useState("");

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

  const handleDelete = (id: string) => {
    if (!confirm("Delete this case study?")) return;
    startTransition(async () => {
      try {
        await deleteCaseStudy(id);
        toast.success("Case study deleted.");
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
    <div>
      <PageHead
        title={`Case Studies & Work (${caseStudies.length})`}
        sub="Manage agency portfolio projects, metrics, tech stack, and case study detail pages."
        action={
          <button
            onClick={() =>
              setEditing({
                title: "",
                slug: "",
                client_name: "",
                industry: "",
                cover_url: "",
                challenge: "",
                solution: "",
                outcome: "",
                metrics: [],
                tech_stack: [],
                services: [],
                live_url: "",
                is_featured: false,
                is_published: true,
                sort_order: 0,
              })
            }
            className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2"
          >
            <Plus size={14} /> Add Case Study
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {caseStudies.map((c) => (
          <div key={c.id} className="card p-5 border-ink-600 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded">
                  {c.industry || "Case Study"}
                </span>
                {c.is_published ? (
                  <span className="text-[10px] text-lime-400 border border-lime-500/20 px-2 py-0.5 rounded-full">
                    Published
                  </span>
                ) : (
                  <span className="text-[10px] text-bone-500 border border-ink-600 px-2 py-0.5 rounded-full">
                    Draft
                  </span>
                )}
              </div>

              {c.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.cover_url}
                  alt={c.title}
                  className="mt-3 h-32 w-full rounded-lg object-cover border border-ink-700"
                />
              )}

              <h3 className="mt-3 text-base font-semibold text-bone-50">{c.title}</h3>
              {c.client_name && <p className="text-xs text-bone-400 mt-0.5">Client: {c.client_name}</p>}
              {c.outcome && <p className="mt-2 text-xs text-bone-300 line-clamp-2">{c.outcome}</p>}

              {!!(c.tech_stack ?? []).length && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {(c.tech_stack ?? []).slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] bg-ink-800 text-bone-400 px-2 py-0.5 rounded">
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
                  className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-2xl p-6 sm:p-8 bg-ink-900 border-ink-600 my-8 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-bone-50 mb-4">
              {editing.id ? "Edit Case Study" : "New Case Study"}
            </h2>

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
                <label className="mono-tag text-xs mb-1 block">Client Name</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.client_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, client_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="https://..."
                  value={editing.live_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, live_url: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mono-tag text-xs mb-1 block">Key Outcome / Subtitle</label>
              <input
                className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                placeholder="e.g. Scaled platform to 100k daily active users with sub-second response times."
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
                  placeholder="Type a technology (e.g. Next.js, Supabase, Tailwind) & press Add"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTechTag())}
                />
                <button type="button" onClick={addTechTag} className="btn btn-primary h-8 px-3 text-xs">
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

            {/* Services Tags Builder */}
            <div>
              <label className="mono-tag text-xs mb-1 block">Services Provided</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  className="flex-1 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="Type a service (e.g. Web Development, UI/UX Design) & press Add"
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addServiceTag())}
                />
                <button type="button" onClick={addServiceTag} className="btn btn-primary h-8 px-3 text-xs">
                  Add Service
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(editing.services || []).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800 px-3 py-1 text-xs text-bone-200">
                    {s}
                    <button type="button" onClick={() => removeServiceTag(s)} className="text-bone-400 hover:text-rose-400">
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
                <button type="button" onClick={addMetric} className="text-xs text-lime-400 hover:underline">
                  + Add Metric Pair
                </button>
              </div>
              <div className="space-y-2">
                {(editing.metrics || []).map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                      placeholder="Metric Value (e.g. +140%)"
                      value={m.value}
                      onChange={(e) => updateMetric(idx, "value", e.target.value)}
                    />
                    <input
                      className="flex-1 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                      placeholder="Metric Label (e.g. Conversion Rate)"
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

            <div>
              <label className="mono-tag text-xs mb-1 block">The Challenge</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-ink-500 bg-ink-800 p-2.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                value={editing.challenge ?? ""}
                onChange={(e) => setEditing({ ...editing, challenge: e.target.value })}
              />
            </div>

            <div>
              <label className="mono-tag text-xs mb-1 block">Our Solution</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-ink-500 bg-ink-800 p-2.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                value={editing.solution ?? ""}
                onChange={(e) => setEditing({ ...editing, solution: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-300">
                <input
                  type="checkbox"
                  checked={editing.is_published ?? true}
                  onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                  className="accent-[color:var(--color-lime-400)]"
                />
                <span>Publish publicly</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-300">
                <input
                  type="checkbox"
                  checked={editing.is_featured ?? false}
                  onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
                  className="accent-[color:var(--color-lime-400)]"
                />
                <span>Feature on Homepage</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-ink-700/60 pt-4">
              <button className="btn h-9 px-4 text-xs" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-xs" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : "Save Case Study"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
