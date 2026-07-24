"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { savePost, deletePost } from "@/lib/actions/cms";
import { Plus, Trash2, Edit3 } from "lucide-react";
import { PageHead } from "@/components/admin/ui";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  read_minutes: number | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export default function BlogClient({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<Post> | null>(null);

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

  const handleDelete = (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    startTransition(async () => {
      try {
        await deletePost(id);
        toast.success("Blog post deleted.");
        router.refresh();
      } catch {
        toast.error("Failed to delete blog post.");
      }
    });
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

              <h3 className="mt-3 text-base font-semibold text-bone-50">{p.title}</h3>
              {p.excerpt && <p className="mt-2 text-xs text-bone-300 line-clamp-2">{p.excerpt}</p>}
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
                  onClick={() => handleDelete(p.id)}
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
          <div className="card w-full max-w-xl p-6 bg-ink-900 border-ink-600 my-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-bone-50 mb-4">
              {editing.id ? "Edit Article" : "Write New Article"}
            </h2>

            <div className="space-y-3">
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
                <label className="mono-tag text-xs mb-1 block">Article Body (Markdown)</label>
                <textarea
                  rows={6}
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 p-3 text-xs text-bone-50 focus:border-lime-400 focus:outline-none font-mono leading-relaxed"
                  value={editing.content ?? ""}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
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
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn h-9 px-4 text-xs" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary h-9 px-4 text-xs" onClick={handleSave} disabled={pending}>
                {pending ? "Saving..." : "Save Article"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
