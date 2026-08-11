"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type FilterDropdownProps = {
  activeCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear?: () => void;
  children: ReactNode;
  label?: string;
  align?: "left" | "right";
};

export function FilterDropdown({
  activeCount,
  open,
  onOpenChange,
  onClear,
  children,
  label = "Filtros",
  align = "right",
}: FilterDropdownProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const hasActiveFilters = activeCount > 0;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  useEffect(() => {
    onOpenChange(false);
  }, [onOpenChange, pathname]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`filter-dropdown-button inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${hasActiveFilters || open ? "is-active" : ""}`}
        aria-label={label}
        title={label}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4.5h18M6.75 12h10.5M10 19.5h4" />
        </svg>
        {hasActiveFilters ? <span className="rounded-full bg-blue-500 px-1.5 text-[11px] font-bold leading-5 text-white">{activeCount}</span> : null}
      </button>

      {open ? (
        <div className={`fixed inset-x-3 bottom-3 z-50 sm:absolute sm:inset-auto sm:bottom-auto sm:top-full sm:mt-2 ${align === "right" ? "sm:right-0" : "sm:left-0"}`}>
          <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl sm:w-80">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{label}</p>
              {hasActiveFilters && onClear ? (
                <button type="button" onClick={onClear} className="text-xs font-medium text-slate-400 transition-colors hover:text-white">
                  Limpar
                </button>
              ) : null}
            </div>
            <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1 sm:max-h-96">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type FilterSectionProps = {
  title: string;
  children: ReactNode;
  activeCount?: number;
  defaultOpen?: boolean;
};

export function FilterSection({ title, children, activeCount = 0, defaultOpen = false }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen || activeCount > 0);


  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-800/60 ${open ? "text-white" : "text-slate-300"}`}
      >
        <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {activeCount > 0 ? <span className="rounded-full bg-blue-500 px-1.5 text-[10px] font-bold leading-4 text-white">{activeCount}</span> : null}
          <svg className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open ? <div className="space-y-1.5 px-2 pb-2 pt-1">{children}</div> : null}
    </div>
  );
}

type FilterCheckboxProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
};

export function FilterCheckbox({ label, checked, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

export function toggleFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}