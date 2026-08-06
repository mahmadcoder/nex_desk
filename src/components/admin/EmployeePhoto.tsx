"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import Modal from "@/components/admin/Modal";
import ImageUpload from "@/components/admin/ImageUpload";
import PhotoViewer from "@/components/PhotoViewer";
import { initials } from "@/components/Avatar";
import { setEmployeePhoto } from "@/lib/actions/staff";

/**
 * The employee hero avatar, made editable.
 *
 * It was a static 80px square, and the only way to change someone's photo was
 * the edit modal on the employees *list* — a page away from where you are
 * actually looking at the person.
 *
 * Clicking views it. The camera button changes it.
 */
export default function EmployeePhoto({
  employeeId,
  name,
  url,
}: {
  employeeId: string;
  name: string;
  url: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [draft, setDraft] = useState(url ?? "");

  function save(next: string) {
    start(async () => {
      const res = await setEmployeePhoto(employeeId, next || null);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save that photo.");
        return;
      }
      toast.success(next ? "Photo updated." : "Photo removed.");
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => (url ? setViewing(true) : setEditing(true))}
        title={url ? "View full size" : "Add a photo"}
        className="block h-20 w-20 overflow-hidden rounded-2xl border-2 border-lime-400/40 bg-ink-800 shadow-lg transition hover:border-lime-400/70"
      >
        {url ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-lime-400/10 text-2xl font-bold text-lime-400">
            {initials(name)}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          setDraft(url ?? "");
          setEditing(true);
        }}
        aria-label="Change photo"
        title="Change photo"
        className="absolute -bottom-1.5 -right-1.5 grid h-8 w-8 place-items-center rounded-full border border-ink-600 bg-ink-800 text-bone-300 shadow-lg transition hover:border-lime-400/50 hover:text-lime-400"
      >
        <Camera size={14} />
      </button>

      <PhotoViewer src={url} alt={name} open={viewing} onClose={() => setViewing(false)} />

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        pending={pending}
        title={`${name}'s photo`}
        description="Clients see this beside their name in the portal. Changing it here applies immediately."
        footer={
          <>
            <button className="btn" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => save(draft)}
              disabled={pending || draft === (url ?? "")}
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <ImageUpload
          label="Photo"
          value={draft}
          onChange={setDraft}
          folder="employees"
          shape="circle"
          removeWarning="Their photo comes off the client portal as soon as you save. Every photo they have set stays in the history below."
        />
      </Modal>
    </div>
  );
}
