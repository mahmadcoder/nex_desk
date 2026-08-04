"use client";

import { Search, X } from "lucide-react";

/**
 * The search box on the CMS lists, and the message when nothing matches.
 *
 * These lists had no search at all: once a catalogue passes a dozen entries,
 * finding one means scrolling and reading. And an empty result with no
 * explanation reads as a broken page rather than as "nothing matched" — which
 * is the whole reason this pairs the input with its own empty state.
 */
export function CmsSearch({
  value,
  onChange,
  placeholder = "Search…",
  count,
  total,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** How many are showing now. */
  count: number;
  /** How many exist in total. */
  total: number;
}) {
  if (!total) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="mono-tag text-[11px]">
        {value.trim() ? `${count} of ${total}` : `${total} total`}
      </p>

      <div className="relative">
        <Search
          size={14}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone-500"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-lg border border-ink-500 bg-ink-800 py-2 pl-9 pr-8 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none sm:w-64"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-bone-500 hover:text-bone-100"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Shown in place of the list when a search matched nothing. */
export function NoMatches({ query, noun }: { query: string; noun: string }) {
  return (
    <div className="card p-12 text-center">
      <h2 className="text-lg text-bone-100">Nothing matches &ldquo;{query}&rdquo;</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-bone-400">
        No {noun} contains that. Check the spelling, try a shorter word, or clear the search to
        see everything again.
      </p>
    </div>
  );
}

/** Case-insensitive match across a few fields. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f && String(f).toLowerCase().includes(q));
}
