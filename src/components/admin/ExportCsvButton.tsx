"use client";

import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

interface ExportCsvButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
  className?: string;
}

export default function ExportCsvButton({
  filename,
  headers,
  rows,
  label = "Export CSV",
  className,
}: ExportCsvButtonProps) {
  const handleExport = () => {
    downloadCsv(filename, headers, rows);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className={cn(
        "mono-tag inline-flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800/80 px-3 py-1.5 text-xs text-bone-300 transition-colors hover:border-lime-400/50 hover:text-lime-300 cursor-pointer shadow-sm",
        className
      )}
      title="Download spreadsheet formatted CSV"
    >
      <Download size={13} className="text-lime-400" />
      <span>{label}</span>
    </button>
  );
}
