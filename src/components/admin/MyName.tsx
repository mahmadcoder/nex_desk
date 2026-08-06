"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Check, X } from "lucide-react";
import { updateMyName } from "@/lib/actions/staff";

/**
 * Your own name, editable in place.
 *
 * Nothing in the app could set this before — Settings told you to go and run
 * SQL. For an owner it matters more than it looks: the name here is what the
 * sidebar shows, what the dashboard greets you by, and the `sender_name` on
 * every email the agency sends.
 */
export default function MyName({ name }: { name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  function save() {
    const next = draft.trim();
    if (next === name) {
      setEditing(false);
      return;
    }
    start(async () => {
      const res = await updateMyName(next);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save that.");
        return;
      }
      toast.success("Name updated.");
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        title="Change your name"
        className="group inline-flex max-w-full items-center gap-1.5"
      >
        <span className="truncate text-base font-semibold text-bone-50">{name}</span>
        <Pencil
          size={12}
          className="shrink-0 text-bone-500 transition-colors group-hover:text-lime-400"
        />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <input
        autoFocus
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-full min-w-0 rounded-lg border border-ink-500 bg-ink-800 px-2.5 py-1.5 text-center text-sm text-bone-50 focus:border-lime-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        aria-label="Save"
        className="shrink-0 rounded-md p-1.5 text-lime-400 hover:bg-ink-700"
      >
        <Check size={15} />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={pending}
        aria-label="Cancel"
        className="shrink-0 rounded-md p-1.5 text-bone-400 hover:bg-ink-700"
      >
        <X size={15} />
      </button>
    </div>
  );
}
