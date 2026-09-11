import Link from "next/link";
import { cn } from "@/lib/utils";
import LiveSearchInput from "@/components/admin/LiveSearchInput";

/**
 * Status chips and a search box for the admin list pages.
 *
 * Every list in the panel grew to "everything ever, newest first" with no way
 * to narrow it. Ctrl+K finds a thing you can already name; it cannot answer
 * "which invoices are overdue in PKR" or "what did we ship for Acme".
 *
 * Deliberately a server component with a plain GET form and ordinary links —
 * filtering a server-rendered table needs no JavaScript, and doing it this way
 * keeps the filter state in the URL, which means it survives a refresh and can
 * be bookmarked or pasted to someone else.
 */

export type FilterChip = {
  key: string;
  label: string;
  count?: number;
};

export default function ListFilters({
  basePath,
  chips,
  active,
  query,
  placeholder = "Search…",
  paramName = "status",
  extraParams = {},
}: {
  /** Where the form and links point, e.g. "/nx-control/projects". */
  basePath: string;
  chips: FilterChip[];
  active: string;
  /** Current search term, echoed back into the box. */
  query?: string;
  placeholder?: string;
  paramName?: string;
  /** Other query params to preserve when a chip is clicked. */
  extraParams?: Record<string, string | undefined>;
}) {
  const carry = Object.entries(extraParams).filter(([, v]) => v);

  const hrefFor = (key: string) => {
    const params = new URLSearchParams();
    if (key) params.set(paramName, key);
    if (query) params.set("q", query);
    for (const [k, v] of carry) params.set(k, v!);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.key}
            href={hrefFor(c.key)}
            className={cn(
              "mono-tag rounded-full border px-3 py-1.5 text-[11px] transition-colors",
              active === c.key
                ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                : "border-ink-600 text-bone-300 hover:border-ink-400 hover:text-bone-100"
            )}
          >
            {c.label}
            {c.count !== undefined && <span className="ml-1.5 opacity-60">{c.count}</span>}
          </Link>
        ))}
      </div>

      {/* Live as-you-type search component with debounce and clear button */}
      <LiveSearchInput placeholder={placeholder} paramName="q" />
    </div>
  );
}

/**
 * Case-insensitive "does this row match" across a few fields.
 *
 * Filtering in memory rather than in the query on purpose: these lists are
 * already fetched whole for their counts and totals, they are small (an agency
 * has hundreds of rows, not millions), and a second round trip per keystroke
 * would be slower than the filtering it replaced.
 */
export function matches(needle: string | undefined, ...fields: (string | null | undefined)[]) {
  if (!needle?.trim()) return true;
  const q = needle.trim().toLowerCase();
  return fields.some((f) => f && String(f).toLowerCase().includes(q));
}
