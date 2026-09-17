/**
 * CSV that survives Excel.
 *
 * Escaped per RFC 4180 with CSV formula injection protection and UTF-8 BOM.
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

  // A BOM, so Excel opens UTF-8 as UTF-8 rather than mangling accented names and symbols.
  return `\uFEFF${head}\r\n${body}`;
}

/**
 * Triggers the download. Browser-only.
 * Supports:
 * 1. downloadCsv(filename, rows: Record<string, unknown>[], columns?: string[])
 * 2. downloadCsv(filename, headers: string[], rows: (string | number | null | undefined)[][])
 */
export function downloadCsv(
  filename: string,
  arg1: Record<string, unknown>[] | string[],
  arg2?: string[] | (string | number | null | undefined)[][]
): void {
  if (typeof window === "undefined") return;

  let csvContent = "";

  // Check signature
  if (Array.isArray(arg1) && typeof arg1[0] === "string") {
    // Signature 2: (filename, headers: string[], rows: (string | number)[][])
    const headers = arg1 as string[];
    const rows = (arg2 as (string | number | null | undefined)[][]) ?? [];
    const head = headers.map(cell).join(",");
    const body = rows.map((r) => r.map(cell).join(",")).join("\r\n");
    csvContent = `\uFEFF${head}\r\n${body}`;
  } else {
    // Signature 1: (filename, rows: Record<string, unknown>[], columns?: string[])
    const rows = (arg1 as Record<string, unknown>[]) ?? [];
    const cols = arg2 as string[] | undefined;
    csvContent = toCsv(rows, cols);
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
