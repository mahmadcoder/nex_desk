"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DollarSign, Layers } from "lucide-react";

type TabProps = {
  /** Resolved on the server: "ALL", or a currency code. */
  currency?: string;
  /** Resolved on the server: "strict" | "converted". */
  mode?: string;
};

const CURRENCIES = [
  { code: "ALL", label: "All (Original)", flagUrl: "" },
  { code: "PKR", label: "PKR (Rs)", flagUrl: "https://flagcdn.com/w40/pk.png" },
  { code: "USD", label: "USD ($)", flagUrl: "https://flagcdn.com/w40/us.png" },
  { code: "EUR", label: "EUR (€)", flagUrl: "https://flagcdn.com/w40/eu.png" },
  { code: "GBP", label: "GBP (£)", flagUrl: "https://flagcdn.com/w40/gb.png" },
];

/**
 * A year, in seconds. The choice is a preference, not a session — coming back
 * tomorrow to a dashboard in the currency you left it in is the whole point.
 */
const REMEMBER_FOR = 60 * 60 * 24 * 365;

/**
 * Persist the choice so navigating away and back does not reset it.
 *
 * The selection used to live only in `searchParams`, and every link back to the
 * dashboard targets the bare path — so leaving the page threw it away. A cookie
 * survives that, and the page still lets an explicit `?curr=` win so a shared
 * link keeps working.
 */
const remember = (key: string, value: string | null) => {
  document.cookie = value
    ? `${key}=${encodeURIComponent(value)};path=/;max-age=${REMEMBER_FOR};samesite=lax`
    : `${key}=;path=/;max-age=0;samesite=lax`;
};

function CurrencyTabsContent({ currency, mode: modeProp }: TabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The server resolves this (searchParam first, then the remembered cookie)
  // and passes it down, so the highlighted pill always matches the figures
  // actually on screen. Falls back to the URL if rendered without props.
  const activeCurrency = currency ?? searchParams.get("curr") ?? "ALL";
  const mode = modeProp ?? searchParams.get("mode") ?? "strict"; // "strict" vs "converted"

  const handleSelectCurrency = (code: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (code === "ALL") {
      params.delete("curr");
    } else {
      params.set("curr", code);
    }
    remember("nx_dash_curr", code === "ALL" ? null : code);
    router.push(`?${params.toString()}`);
  };

  const handleToggleMode = (newMode: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", newMode);
    remember("nx_dash_mode", newMode);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-6 bg-ink-900/90 p-3 sm:p-3.5 rounded-xl border border-ink-600 shadow-md">
      {/* Mode Switcher */}
      <div className="flex items-center gap-1 bg-ink-950 p-1 rounded-lg border border-ink-700 w-full sm:w-auto shrink-0">
        <button
          type="button"
          onClick={() => handleToggleMode("strict")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            mode === "strict"
              ? "bg-lime-400 text-lime-950 font-semibold shadow"
              : "text-bone-400 hover:text-bone-100"
          }`}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Strict<span className="hidden sm:inline"> Contract</span></span>
        </button>

        <button
          type="button"
          onClick={() => handleToggleMode("converted")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            mode === "converted"
              ? "bg-lime-400 text-lime-950 font-semibold shadow"
              : "text-bone-400 hover:text-bone-100"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate"><span className="hidden sm:inline">Live </span>Converted</span>
        </button>
      </div>

      {/* Currency Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
        <span className="mono-tag text-[10px] text-bone-400 hidden md:inline mr-1 shrink-0">Filter:</span>
        {CURRENCIES.map((c) => {
          const active = activeCurrency === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => handleSelectCurrency(c.code)}
              className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                active
                  ? "bg-ink-700 text-lime-400 font-bold border border-lime-400/40"
                  : "text-bone-300 hover:text-bone-50 hover:bg-ink-800 border border-transparent"
              }`}
            >
              {c.flagUrl && (
                <img src={c.flagUrl} alt="" className="w-3.5 h-2.5 object-cover rounded-xs shrink-0" />
              )}
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardCurrencyTabs(props: TabProps) {
  return (
    <Suspense fallback={<div className="h-14 mb-6 rounded-xl bg-ink-900/50 animate-pulse border border-ink-600" />}>
      <CurrencyTabsContent {...props} />
    </Suspense>
  );
}
