"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

export default function LiveSearchInput({
  placeholder = "Search…",
  paramName = "q",
  className = "w-full sm:w-64",
}: {
  placeholder?: string;
  paramName?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlQuery = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(urlQuery);
  const firstRender = useRef(true);

  // Keep local input in sync if URL searchParam changes from outside (e.g. back button or link click)
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  // Debounced URL update as user types
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const currentUrlParam = searchParams.get(paramName) ?? "";
      const trimmed = value.trim();

      if (trimmed === currentUrlParam) return;

      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set(paramName, trimmed);
      } else {
        params.delete(paramName);
      }

      // Reset pagination if present
      if (params.has("page")) params.delete("page");

      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;

      startTransition(() => {
        router.replace(nextUrl, { scroll: false });
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [value, paramName, pathname, router, searchParams]);

  function handleClear() {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    if (params.has("page")) params.delete("page");
    const qs = params.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone-500">
        {isPending ? (
          <Loader2 size={14} className="animate-spin text-lime-400" />
        ) : (
          <Search size={14} />
        )}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleClear();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-ink-500 bg-ink-800 py-2 pl-9 pr-8 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none transition-colors"
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-bone-400 hover:bg-ink-700 hover:text-bone-100 transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
