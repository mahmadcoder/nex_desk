"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Magic-link callback. Supabase puts the session in the URL hash. */
export default function PortalAuth() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? "/portal" : "/portal/login");
    });
  }, [router]);

  return <p className="mono-tag py-20 text-center">signing you in…</p>;
}
