"use client";

import { useState } from "react";
import Link from "next/link";
import CustomSelect from "@/components/ui/CustomSelect";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The audit log's filter row.
 *
 * Split out of the page purely so it can be a client component: the page is a
 * server component with a plain GET `<form>`, which is why it used native
 * `<select>` elements and why they rendered as white OS menus on Windows.
 *
 * The form stays a GET form. `CustomSelect` emits a hidden input for its
 * `name`, so pressing Filter still navigates to `?who=…&entity=…&days=…` with
 * no router code — and the resulting URL is still shareable and bookmarkable.
 */
export default function AuditFilters({
  actors,
  entities,
  ranges,
  initial,
  resetHref,
}: {
  actors: { id: string; full_name: string | null; email: string | null }[];
  entities: [string, string][];
  ranges: { key: string; label: string }[];
  initial: { who: string; entity: string; days: string; q: string };
  resetHref: string;
}) {
  const [who, setWho] = useState(initial.who);
  const [entity, setEntity] = useState(initial.entity);
  const [days, setDays] = useState(initial.days);
  const [q, setQ] = useState(initial.q);

  const dirty = !!who || !!entity || !!q || days !== "7";

  return (
    <form className="mb-5 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
      {/* Each picker gets a floor and a ceiling. Below 150px an employee name
          truncates to nothing; above 220px three of them push the search box
          off the row on a laptop. */}
      <div className="min-w-0 lg:w-[190px]">
        <CustomSelect
          label="Who"
          name="who"
          value={who}
          onChange={setWho}
          placeholder="Anyone"
          options={[
            { value: "", label: "Anyone" },
            ...actors.map((a) => ({ value: a.id, label: a.full_name || a.email || "Unknown" })),
          ]}
        />
      </div>

      <div className="min-w-0 lg:w-[190px]">
        <CustomSelect
          label="What"
          name="entity"
          value={entity}
          onChange={setEntity}
          placeholder="Everything"
          options={[{ value: "", label: "Everything" }, ...entities.map(([value, label]) => ({ value, label }))]}
        />
      </div>

      <div className="min-w-0 lg:w-[140px]">
        <CustomSelect
          label="When"
          name="days"
          value={days}
          onChange={setDays}
          options={ranges.map((r) => ({ value: r.key, label: r.label }))}
        />
      </div>

      <div className="min-w-0 sm:col-span-2 lg:min-w-[180px] lg:flex-1">
        <label htmlFor="audit-q" className="mono-tag mb-1.5 block">
          Search
        </label>
        <input
          id="audit-q"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="a name, an email, a field…"
          // Matches the CustomSelect trigger exactly — same height, same
          // padding, same border — so the row reads as one control strip.
          className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-sm text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
        <button className="btn btn-primary h-[42px] px-5 text-sm">Filter</button>
        {dirty && (
          <Link href={resetHref} className="mono-tag text-[11px] hover:text-lime-400">
            reset
          </Link>
        )}
      </div>
    </form>
  );
}
