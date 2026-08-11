import type { ButtonHTMLAttributes } from "react";

type RefreshButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
};

export function RefreshButton({ label = "Recarregar", className = "", ...props }: RefreshButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`refresh-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border p-0 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      {...props}
    >
      <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m0 0A7.5 7.5 0 0118.75 6.5M4.582 9H9m11 11v-5h-.581m0 0A7.5 7.5 0 015.25 17.5M19.419 15H15" />
      </svg>
    </button>
  );
}
