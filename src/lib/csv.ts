/**
 * CSV that survives Excel.
 *
 * `SubscribersClient` built its own by wrapping every value in quotes, which
 * breaks the moment a value contains a quote — a company called 6'2" Studio
 * produced a file with the columns shifted from that row down, and nobody
 * notices until the totals are wrong.
 */

/**
 * One field, escaped per RFC 4180.
 *
 * A leading `=`, `+`, `-` or `@` is prefixed with a quote: Excel treats those
 * as formulas, so a client note reading `=1+1` becomes a calculation, and
 * `=HYPERLINK(...)` in a name field is a genuine injection route into whoever
 * opens the export.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";

  // Numbers are never escaped. The guard below starts with `-`, so escaping
  // them would turn every negative amount into the text `'-5` and silently
  // break every SUM in the exported sheet.
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "yes" : "no";

  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  // Quote only when needed, and double any quote inside.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (!rows.length) return "";

  const cols = columns ?? Object.keys(rows[0]);
  const head = cols.map(cell).join(",");
  const body = rows.map((r) => cols.map((c) => cell(r[c])).join(",")).join("\r\n");

  // A BOM, so Excel opens UTF-8 as UTF-8 rather than mangling every accented
  // name and every currency symbol that is not a dollar.
  return `﻿${head}\r\n${body}`;
}

/** Triggers the download. Browser-only. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns?: string[]) {
  const blob = new Blob([toCsv(rows, columns)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Released rather than left held for the life of the page.
  URL.revokeObjectURL(url);
}
