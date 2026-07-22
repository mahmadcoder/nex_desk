"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DollarSign, Layers } from "lucide-react";

const CURRENCIES = [
  { code: "ALL", label: "All (Original)", flagUrl: "" },
  { code: "PKR", label: "PKR (Rs)", flagUrl: "https://flagcdn.com/w40/pk.png" },
  { code: "USD", label: "USD ($)", flagUrl: "https://flagcdn.com/w40/us.png" },
  { code: "EUR", label: "EUR (€)", flagUrl: "https://flagcdn.com/w40/eu.png" },
  { code: "GBP", label: "GBP (£)", flagUrl: "https://flagcdn.com/w40/gb.png" },
];

export default function DashboardCurrencyTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCurrency = searchParams.get("curr") || "ALL";
  const mode = searchParams.get("mode") || "strict"; // "strict" vs "converted"

  const handleSelectCurrency = (code: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (code === "ALL") {
      params.delete("curr");
    } else {
      params.set("curr", code);
    }
    router.push(`?${params.toString()}`);
  };

  const handleToggleMode = (newMode: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", newMode);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-6 bg-ink-900/90 p-3.5 rounded-xl border border-ink-600 shadow-md">
      {/* Mode Switcher */}
      <div className="flex items-center gap-1.5 bg-ink-950 p-1 rounded-lg border border-ink-700 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => handleToggleMode("strict")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            mode === "strict"
              ? "bg-lime-400 text-lime-950 font-semibold shadow"
              : "text-bone-400 hover:text-bone-100"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Strict Contract Currency</span>
        </button>

        <button
          type="button"
          onClick={() => handleToggleMode("converted")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            mode === "converted"
              ? "bg-lime-400 text-lime-950 font-semibold shadow"
              : "text-bone-400 hover:text-bone-100"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Live Converted View</span>
        </button>
      </div>

      {/* Currency Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mono-tag text-[10px] text-bone-400 hidden sm:inline mr-1">Filter Currency:</span>
        {CURRENCIES.map((c) => {
          const active = activeCurrency === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => handleSelectCurrency(c.code)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                active
                  ? "bg-ink-700 text-lime-400 font-bold border border-lime-400/40"
                  : "text-bone-300 hover:text-bone-50 hover:bg-ink-800 border border-transparent"
              }`}
            >
              {c.flagUrl && (
                <img src={c.flagUrl} alt="" className="w-4 h-3 object-cover rounded-xs shrink-0" />
              )}
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
