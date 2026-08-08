"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/csv";
import { Download, ArrowUpDown } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * A report, on screen and as a file.
 *
 * The CSV is built from the SAME rows the table renders, not a second query —
 * so the file somebody sends their accountant cannot disagree with the figures
 * they were looking at when they pressed the button.
 */
export default function ReportTable({
  rows,
  filename,
  emptyLabel = "Nothing in this range.",
}: {
  rows: Record<string, unknown>[];
  filename: string;
  emptyLabel?: string;
}) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [desc, setDesc] = useState(true);

  if (!rows.length) {
    return <p className="card p-10 text-center text-sm text-bone-400">{emptyLabel}</p>;
  }

  const cols = Object.keys(rows[0]);

  const sorted = sortBy
    ? [...rows].sort((a, b) => {
        const x = a[sortBy];
        const y = b[sortBy];
        // Numbers numerically, everything else as text — sorting 1200 next to
        // 900 as strings puts 1200 first, which is the wrong answer.
        const cmp =
          typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x ?? "").localeCompare(String(y ?? ""));
        return desc ? -cmp : cmp;
      })
    : rows;

  const isNumeric = (c: string) => typeof rows[0][c] === "number";

  const total = (c: string) =>
    rows.reduce((s, r) => s + (typeof r[c] === "number" ? (r[c] as number) : 0), 0);

  // Only sum columns that are money or counts, and only when there is more than
  // one row — a "total" under a single row is noise.
  const summable = cols.filter((c) => isNumeric(c) && !/%|progress/i.test(c));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="mono-tag text-[11px]">
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() => downloadCsv(filename, rows, cols)}
          className="btn btn-sm gap-1.5"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Horizontal scroll rather than wrapping. A thirteen-column report
          cannot fold onto a second line and still read as one row. */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-ink-600">
              {cols.map((c) => (
                <th
                  key={c}
                  className={`whitespace-nowrap px-4 py-3 font-medium text-bone-300 ${
                    isNumeric(c) ? "text-right" : "text-left"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy === c) setDesc((d) => !d);
                      else {
                        setSortBy(c);
                        setDesc(true);
                      }
                    }}
                    className={`inline-flex items-center gap-1 hover:text-lime-400 ${
                      sortBy === c ? "text-lime-400" : ""
                    }`}
                  >
                    {c}
                    <ArrowUpDown size={10} aria-hidden />
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="border-b border-ink-700/60 hover:bg-ink-800/30">
                {cols.map((c) => (
                  <td
                    key={c}
                    className={`whitespace-nowrap px-4 py-2.5 ${
                      isNumeric(c)
                        ? "text-right text-bone-200"
                        : "text-bone-300"
                    }`}
                    style={isNumeric(c) ? { fontFamily: "var(--font-mono)" } : undefined}
                  >
                    {r[c] === null || r[c] === undefined || r[c] === ""
                      ? "—"
                      : typeof r[c] === "boolean"
                        ? r[c]
                          ? "yes"
                          : "no"
                        : typeof r[c] === "number"
                          ? (r[c] as number).toLocaleString()
                          : String(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {rows.length > 1 && summable.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-ink-500 bg-ink-900/60">
                {cols.map((c, i) => (
                  <td
                    key={c}
                    className={`whitespace-nowrap px-4 py-2.5 font-medium ${
                      isNumeric(c) ? "text-right text-bone-100" : "text-bone-400"
                    }`}
                    style={isNumeric(c) ? { fontFamily: "var(--font-mono)" } : undefined}
                  >
                    {i === 0 ? "Total" : summable.includes(c) ? total(c).toLocaleString() : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-bone-400">
        Amounts are shown in each row&apos;s own currency and are not converted. A single total
        across two currencies would be a number that means nothing.
      </p>
    </div>
  );
}
