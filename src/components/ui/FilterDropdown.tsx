"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

const FILTER_ANIMATION_MS = 200;

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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openFrameRef = useRef<number | null>(null);
  const pathname = usePathname();
  const hasActiveFilters = activeCount > 0;
  const [closing, setClosing] = useState(false);
  const [entering, setEntering] = useState(false);
  const renderDropdown = open || closing;

  const clearAnimationHandles = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openFrameRef.current !== null) {
      cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }
  }, []);

  const openDropdown = useCallback(() => {
    clearAnimationHandles();
    setClosing(false);
    setEntering(true);
    onOpenChange(true);
    openFrameRef.current = requestAnimationFrame(() => {
      setEntering(false);
      openFrameRef.current = null;
    });
  }, [clearAnimationHandles, onOpenChange]);

  const closeDropdown = useCallback(() => {
    if (!open && !closing) return;

    clearAnimationHandles();
    setEntering(false);
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setClosing(false);
      closeTimerRef.current = null;
      onOpenChange(false);
    }, FILTER_ANIMATION_MS);
  }, [clearAnimationHandles, closing, onOpenChange, open]);

  useEffect(() => clearAnimationHandles, [clearAnimationHandles]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) closeDropdown();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDropdown();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDropdown, open]);

  useEffect(() => {
    onOpenChange(false);
  }, [onOpenChange, pathname]);

  return (
    <div ref={ref} className="relative inline-flex w-auto shrink-0">
      <button
        type="button"
        onClick={() => (open ? closeDropdown() : openDropdown())}
        className={`filter-dropdown-button relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border p-0 text-sm font-medium transition-colors ${hasActiveFilters || open ? "is-active" : ""}`}
        aria-label={label}
        title={label}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4.5h18M6.75 12h10.5M10 19.5h4" />
        </svg>
        {hasActiveFilters ? <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold leading-5 text-white">{activeCount}</span> : null}
      </button>

      {renderDropdown ? (
        <>
          <button
            type="button"
            className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ease-out sm:hidden ${closing || entering ? "opacity-0" : "opacity-100"}`}
            aria-label="Fechar filtros"
            onClick={closeDropdown}
          />
          <div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-200 ease-out sm:absolute sm:inset-auto sm:bottom-auto sm:top-full sm:mt-2 sm:transition-opacity ${closing || entering ? "translate-y-full sm:translate-y-0 sm:opacity-0" : "translate-y-0 sm:opacity-100"} ${align === "right" ? "sm:right-0" : "sm:left-0"}`}>
            <div className="w-full overflow-hidden rounded-t-2xl border border-slate-800 bg-slate-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:w-80 sm:rounded-xl sm:pb-4">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700 sm:hidden" aria-hidden="true" />
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{label}</p>
                {hasActiveFilters && onClear ? (
                  <button type="button" onClick={onClear} className="text-xs font-medium text-slate-400 transition-colors hover:text-white">
                    Limpar
                  </button>
                ) : null}
              </div>
              <div className="max-h-[62dvh] space-y-2 overflow-y-auto pr-1 sm:max-h-96">{children}</div>
            </div>
          </div>
        </>
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