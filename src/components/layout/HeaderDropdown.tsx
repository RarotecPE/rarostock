"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type HeaderIconButtonProps = {
  label: string;
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};

type HeaderDropdownProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function HeaderIconButton({
  label,
  active = false,
  children,
  onClick,
  type = "button",
  className = "",
}: HeaderIconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-slate-400 transition-colors hover:text-white ${
        active
          ? "border-blue-500/40 bg-blue-600/20 text-blue-300"
          : "border-transparent hover:border-slate-700 hover:bg-slate-800/70"
      } ${className}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function HeaderDropdown({ open, onClose, children, className = "" }: HeaderDropdownProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className={`absolute right-0 top-full z-50 mt-2 ${className}`}>
      <div className="w-80 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
