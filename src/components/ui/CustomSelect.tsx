"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  className,
  disabled = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-left text-sm transition-all duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          open
            ? "border-lime-400 ring-1 ring-lime-400 bg-ink-800"
            : "hover:border-lime-400/70 text-bone-50",
          className
        )}
      >
        <span className={selectedOption ? "text-bone-50 font-medium" : "text-bone-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-bone-400 transition-transform duration-200 shrink-0 ml-2",
            open && "rotate-180 text-lime-400"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-ink-600 bg-ink-900/95 p-1.5 shadow-2xl backdrop-blur-md custom-admin-scrollbar">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-bone-500">No options available</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors text-left my-0.5",
                    isSelected
                      ? "bg-lime-400/15 text-lime-400 font-semibold"
                      : "text-bone-200 hover:bg-ink-800 hover:text-bone-50"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span className="mono-tag text-[10px] text-lime-400 bg-lime-400/10 px-1.5 py-0.5 rounded ml-2 shrink-0">
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && <Check size={14} className="text-lime-400 ml-2 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
