"use client";

import { useState, useRef, useEffect, useMemo, useCallback, useId } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import type { SelectOption } from "@/types/site";
export type { SelectOption };

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Rendered above the trigger and wired to it for screen readers. */
  label?: string;
  name?: string;
}

/**
 * The one dropdown in the app.
 *
 * **The rule: no native `<select>` anywhere in this codebase.** One is drawn by
 * the operating system, so on Windows it opens as a white menu in the middle of
 * a dark panel — the app looks like two apps.
 *
 * This is written as a standing rule rather than as "everything has been
 * converted", because the second kind of comment stops being true the first
 * time somebody adds a screen. `grep -rn "<select" src/` should only ever match
 * this file. Twelve of them had crept back in before that was checked.
 *
 * Keyboard behaviour matches a real listbox: ↑/↓ move, Home/End jump, Enter or
 * Space commits, Escape closes and returns focus to the trigger, and typing
 * jumps to the first option starting with those letters.
 */
export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  className,
  disabled = false,
  label,
  name,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ buffer: "", at: 0 });

  const listId = useId();
  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    setActive(-1);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const commit = useCallback(
    (index: number) => {
      const opt = options[index];
      if (!opt) return;
      onChange(opt.value);
      close();
    },
    [options, onChange, close]
  );

  // Opening lands the highlight on the current value, not on the first row.
  useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        // Tab commits nothing and lets focus move on, like a native select.
        close(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(active);
        break;
      default: {
        // Type-ahead: consecutive keystrokes within a second build a prefix.
        if (e.key.length !== 1) return;
        const now = Date.now();
        const t = typeahead.current;
        t.buffer = now - t.at > 1000 ? e.key : t.buffer + e.key;
        t.at = now;
        const q = t.buffer.toLowerCase();
        const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(q));
        if (hit >= 0) setActive(hit);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="mono-tag mb-1.5 block" htmlFor={`${listId}-trigger`}>
          {label}
        </label>
      )}

      {/* Carries the value for anything reading the DOM, e.g. autofill. */}
      {name && <input type="hidden" name={name} value={value} />}

      <button
        ref={triggerRef}
        id={`${listId}-trigger`}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-opt-${active}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-left text-sm transition-colors duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          open
            ? "border-lime-400 ring-1 ring-lime-400"
            : "text-bone-50 hover:border-lime-400/70 focus-visible:border-lime-400",
          className
        )}
      >
        <span className={cn("truncate", selectedOption ? "font-medium text-bone-50" : "text-bone-300")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "ml-2 shrink-0 text-bone-300 transition-transform duration-200",
            open && "rotate-180 text-lime-400"
          )}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-trigger`}
          className="nd-select-menu nd-scroll absolute left-0 right-0 z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-ink-600 bg-ink-900/95 p-1.5 shadow-2xl backdrop-blur-md"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-bone-300">No options available</div>
          ) : (
            options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isActive = i === active;
              return (
                <div
                  key={opt.value}
                  id={`${listId}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => commit(i)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "my-0.5 flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-lime-400/15 font-semibold text-lime-400"
                      : isActive
                        ? "bg-ink-800 text-bone-50"
                        : "text-bone-200"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="ml-2 flex shrink-0 items-center gap-2">
                    {opt.badge && (
                      <span className="mono-tag rounded bg-lime-400/10 px-1.5 py-0.5 text-[10px] text-lime-400">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check size={14} aria-hidden className="text-lime-400" />}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
