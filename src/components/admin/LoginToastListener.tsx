"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

function ToastHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("login_success") === "1") {
      toast.success("Successfully logged in!");
    }
  }, [searchParams]);

  return null;
}

export default function LoginToastListener() {
  return (
    <Suspense fallback={null}>
      <ToastHandler />
    </Suspense>
  );
}
