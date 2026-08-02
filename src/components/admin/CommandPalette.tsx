"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, FolderKanban, Receipt, Inbox, UserCheck, CornerDownLeft } from "lucide-react";
import { globalSearch, type SearchHit } from "@/lib/actions/search";

const ICONS = {
  client: Users,
  project: FolderKanban,
  invoice: Receipt,
  lead: Inbox,
  employee: UserCheck,
} as const;

/**
 * Ctrl+K, from anywhere in the panel.
 *
 * At forty clients, "that invoice for Zenith" stops being a click away and
 * starts being three pages of scanning. Results are scoped server-side by
 * role, so this is a faster door to what you could already see — never a
 * wider one.
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A stale slow response must not overwrite a fresher fast one.
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      setActive(0);
      // Focus after the overlay paints.
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const runSearch = useCallback((q: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const mySeq = ++seq.current;
      if (q.trim().length < 2) {
        setHits([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const results = await globalSearch(q);
        if (mySeq === seq.current) {
          setHits(results);
          setActive(0);
        }
      } finally {
        if (mySeq === seq.current) setSearching(false);
      }
    }, 250);
  }, []);

  const go = (hit: SearchHit) => {
    setOpen(false);
    router.push(hit.href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-ink-950/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto mt-[12vh] w-full max-w-xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card overflow-hidden border-ink-500 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-ink-600 px-4">
            <Search size={16} className="shrink-0 text-bone-300" />
            <input
              ref={inputRef}
              className="h-12 w-full bg-transparent text-sm text-bone-50 placeholder:text-bone-500 focus:outline-none"
              placeholder="Search clients, projects, invoices, leads, staff…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                runSearch(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(hits.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter" && hits[active]) {
                  e.preventDefault();
                  go(hits[active]);
                }
              }}
            />
            <kbd className="mono-tag shrink-0 rounded border border-ink-500 px-1.5 py-0.5 text-[10px] text-bone-400">
              esc
            </kbd>
          </div>

          <div className="max-h-[50vh] overflow-y-auto nd-scroll">
            {query.trim().length < 2 ? (
              <p className="p-5 text-center text-xs text-bone-300">
                Type at least two characters. Open this from anywhere with{" "}
                <kbd className="rounded border border-ink-500 px-1 text-[10px]">Ctrl</kbd>+
                <kbd className="rounded border border-ink-500 px-1 text-[10px]">K</kbd>.
              </p>
            ) : searching && !hits.length ? (
              <p className="p-5 text-center text-xs text-bone-300">Searching…</p>
            ) : !hits.length ? (
              <p className="p-5 text-center text-xs text-bone-300">
                Nothing matches &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <ul className="p-1.5">
                {hits.map((h, i) => {
                  const Icon = ICONS[h.kind];
                  return (
                    <li key={`${h.kind}-${h.href}-${h.title}`}>
                      <button
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                          i === active ? "bg-ink-700 text-bone-50" : "text-bone-200 hover:bg-ink-800"
                        }`}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(h)}
                      >
                        <Icon size={14} className="shrink-0 text-lime-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{h.title}</span>
                          {h.sub && (
                            <span className="mono-tag block truncate text-[11px]">{h.sub}</span>
                          )}
                        </span>
                        <span className="mono-tag shrink-0 text-[10px] text-bone-400">{h.kind}</span>
                        {i === active && (
                          <CornerDownLeft size={12} className="shrink-0 text-bone-400" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
