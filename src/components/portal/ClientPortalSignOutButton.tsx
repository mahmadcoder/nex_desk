"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export default function ClientPortalSignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/portal/login?logged_out=1");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="btn bg-ink-800 hover:bg-ink-700 text-bone-200 hover:text-rose-400 border-ink-600 h-9 px-3 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
      title="Sign Out of Portal"
    >
      <LogOut size={13} />
      <span>Sign Out</span>
    </button>
  );
}
