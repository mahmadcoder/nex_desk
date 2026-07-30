"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { savePost, deletePost } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3, X, Tag } from "lucide-react";
import { PageHead } from "@/components/admin/ui";
import ImageUpload from "@/components/admin/ImageUpload";
import ConfirmModal from "@/components/admin/ConfirmModal";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  tags: string[] | null;
  read_minutes: number | null;
  seo_title: string | null;
  seo_desc: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export default function BlogClient({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [tagInput, setTagInput] = useState("");

  const handleSave = () => {
    if (!editing?.title || !editing?.slug) {
      toast.error("Title and URL Slug are required.");
      return;
    }

    startTransition(async () => {
      try {
        await savePost(editing.id ?? null, {
          title: editing.title,
          slug: (editing.slug || "").toLowerCase().replace(/[^\w-]/g, "-"),
          excerpt: editing.excerpt ?? null,
          content: editing.content ?? null,
          cover_url: editing.cover_url ?? null,
          tags: editing.tags ?? [],
          seo_title: editing.seo_title ?? null,
          seo_desc: editing.seo_desc ?? null,
          read_minutes: editing.read_minutes ? Number(editing.read_minutes) : 5,
          is_published: editing.is_published ?? true,
          published_at: editing.is_published ? new Date().toISOString() : null,
        });
        toast.success(editing.id ? "Blog post updated." : "Blog post created.");
        setEditing(null);
        router.refresh();
      } catch {
        toast.error("Failed to save blog post.");
      }
    });
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const confirmDelete = () => {
    if (!deletingId) return;
    startTransition(async () => {
      try {
        await deletePost(deletingId);
        toast.success("Blog post deleted.");
        setDeletingId(null);
        router.refresh();
      } catch {
        toast.error("Failed to delete blog post.");
      }
    });
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const list = editing?.tags || [];
    if (!list.includes(tagInput.trim())) {
      setEditing({ ...editing, tags: [...list, tagInput.trim()] });
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    const list = (editing?.tags || []).filter((t) => t !== tag);
    setEditing({ ...editing, tags: list });
  };

  return (
    <div>
      <PageHead
        title={`Blog Posts (${posts.length})`}
        sub="Write, edit, and publish engineering articles and agency updates."
        action={
          <button
            onClick={() =>
              setEditing({
                title: "",
                slug: "",
                excerpt: "",
                content: "",
                cover_url: "",
                tags: [],
                seo_title: "",
                seo_desc: "",
                read_minutes: 5,
                is_published: true,
              })
            }
            className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2"
          >
            <Plus size={14} /> Write Article
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {posts.map((p) => (
          <div key={p.id} className="card p-5 border-ink-600 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded">
                  {p.read_minutes ?? 5} min read
                </span>
                {p.is_published ? (
                  <span className="text-[10px] text-lime-400 border border-lime-500/20 px-2 py-0.5 rounded-full">
                    Published
                  </span>
                ) : (
                  <span className="text-[10px] text-bone-500 border border-ink-600 px-2 py-0.5 rounded-full">
                    Draft
                  </span>
                )}
              </div>

              {p.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.cover_url}
                  alt={p.title}
                  className="mt-3 h-32 w-full rounded-lg object-cover border border-ink-700"
                />
              )}

              <h3 className="mt-3 text-base font-semibold text-bone-50">{p.title}</h3>
              {p.excerpt && <p className="mt-2 text-xs text-bone-300 line-clamp-2">{p.excerpt}</p>}

              {!!(p.tags ?? []).length && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {(p.tags ?? []).map((t) => (
                    <span key={t} className="text-[10px] bg-ink-800 text-bone-400 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-ink-700/60 pt-3 flex items-center justify-between">
              <span className="text-[11px] font-mono text-bone-400">/{p.slug}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(p)}
                  className="p-1.5 rounded text-bone-400 hover:text-lime-400 hover:bg-ink-800"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => setDeletingId(p.id)}
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="card w-full max-w-2xl p-5 sm:p-7 relative bg-ink-900 border-ink-600 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto custom-admin-scrollbar space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-700/80 pb-3">
              <h2 className="text-lg font-semibold text-bone-50">
                {editing.id ? "Edit Article" : "Write New Article"}
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
              label="Blog Post Cover Image"
              value={editing.cover_url ?? ""}
              onChange={(url) => setEditing({ ...editing, cover_url: url })}
              folder="blog-covers"
            />

            <div>
              <label className="mono-tag text-xs mb-1 block">Article Title *</label>
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
                <label className="mono-tag text-xs mb-1 block">Estimated Read Time (Minutes)</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
                  value={editing.read_minutes ?? 5}
                  onChange={(e) => setEditing({ ...editing, read_minutes: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Article Tags */}
            <div>
              <label className="mono-tag text-xs mb-1 block">Article Categories / Tags</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  className="flex-1 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="Type a tag (e.g. Engineering, Next.js, Design) & press Add"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <button type="button" onClick={addTag} className="btn btn-primary h-8 px-3 text-xs">
                  Add Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(editing.tags || []).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800 px-3 py-1 text-xs text-bone-200">
                    <Tag size={12} className="text-lime-400" />
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="text-bone-400 hover:text-rose-400">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="mono-tag text-xs mb-1 block">Short Excerpt</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-ink-500 bg-ink-800 p-2.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                value={editing.excerpt ?? ""}
                onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
              />
            </div>

            <div>
              <label className="mono-tag text-xs mb-1 block">Article Content (Markdown / HTML)</label>
              <textarea
                rows={7}
                className="w-full rounded-lg border border-ink-500 bg-ink-800 p-3 text-xs text-bone-50 focus:border-lime-400 focus:outline-none font-mono leading-relaxed"
                value={editing.content ?? ""}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="mono-tag text-xs mb-1 block">SEO Meta Title</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="Custom search title"
                  value={editing.seo_title ?? ""}
                  onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })}
                />
              </div>
              <div>
                <label className="mono-tag text-xs mb-1 block">SEO Meta Description</label>
                <input
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                  placeholder="Custom search description"
                  value={editing.seo_desc ?? ""}
                  onChange={(e) => setEditing({ ...editing, seo_desc: e.target.value })}
                />
              </div>
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
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-ink-700/60 pt-4">
              <button className="btn h-9 px-4 text-xs" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-xs" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : editing.id ? "Update Article" : "Save Article"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Blog Post Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Blog Article"
        description="Are you sure you want to delete this blog post? It will be permanently removed from the website."
        confirmText="Delete Article"
        isDanger={true}
        pending={pending}
        onConfirm={confirmDelete}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
