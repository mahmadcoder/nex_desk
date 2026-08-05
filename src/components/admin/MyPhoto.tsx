"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ImageUpload from "@/components/admin/ImageUpload";
import Avatar from "@/components/Avatar";
import { updateMyPhoto } from "@/lib/actions/staff";

/**
 * The one thing on the profile page that is not read-only.
 *
 * `updateMyPhoto` takes a URL and matches on the caller's own `user_id`, so
 * there is no employee id passed from here that could be tampered with.
 */
export default function MyPhoto({
  name,
  currentUrl,
}: {
  name: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [url, setUrl] = useState<string | null>(currentUrl);

  function save(next: string | null) {
    setUrl(next);
    start(async () => {
      const res = await updateMyPhoto(next);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save that photo.");
        setUrl(currentUrl); // put the old one back rather than lie about it
        return;
      }
      toast.success(next ? "Photo updated." : "Photo removed.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Avatar name={name} src={url} size="lg" className="h-28 w-28" />
      </div>

      <ImageUpload
        label="Your photo"
        value={url ?? ""}
        onChange={(next) => save(next || null)}
        folder="employees"
        shape="circle"
      />

      <p className="text-center text-[11px] leading-relaxed text-bone-400">
        {pending
          ? "Saving…"
          : "Clients see this beside your name in their portal, so a clear photo of your face works best."}
      </p>
    </div>
  );
}
