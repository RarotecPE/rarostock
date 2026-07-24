"use client";

import { useEffect, useRef, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning";
  duration?: number;
  onClose: () => void;
  subMessage?: string;
}

export function Toast({ message, type = "success", duration = 3000, onClose, subMessage }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const startTime = Date.now();
    let closeTimeout: ReturnType<typeof setTimeout> | null = null;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setIsExiting(true);
        closeTimeout = setTimeout(() => onCloseRef.current(), 300);
      }
    }, 50);

    return () => {
      clearInterval(interval);
      if (closeTimeout) clearTimeout(closeTimeout);
    };
  }, [duration]);

  const colors = {
    success: {
      bg: "bg-emerald-950/95 sm:bg-emerald-500/15",
      border: "border-emerald-700/70 sm:border-emerald-500/30",
      text: "text-emerald-200 sm:text-emerald-300",
      progressBg: "bg-emerald-900/70 sm:bg-emerald-500/20",
      progress: "bg-emerald-500",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    error: {
      bg: "bg-rose-950/95 sm:bg-rose-500/15",
      border: "border-rose-700/70 sm:border-rose-500/30",
      text: "text-rose-200 sm:text-rose-300",
      progressBg: "bg-rose-900/70 sm:bg-rose-500/20",
      progress: "bg-rose-500",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      bg: "bg-amber-950/95 sm:bg-amber-500/15",
      border: "border-amber-700/70 sm:border-amber-500/30",
      text: "text-amber-200 sm:text-amber-300",
      progressBg: "bg-amber-900/70 sm:bg-amber-500/20",
      progress: "bg-amber-500",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  };

  const style = colors[type];

  return (
    <div
      className={`fixed top-20 left-4 right-4 sm:left-auto sm:right-4 z-[100] sm:max-w-sm w-auto sm:w-full transform transition-all duration-300 ${
        isExiting ? "translate-y-1 sm:translate-x-full opacity-0" : "translate-y-0 sm:translate-x-0 opacity-100"
      }`}
    >
      <div className={`${style.bg} ${style.border} border rounded-xl shadow-2xl backdrop-blur-md overflow-hidden ring-1 ring-black/30`}>
        <div className="p-4 flex items-start gap-3">
          <div className={`flex-shrink-0 ${style.text}`}>
            {style.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${style.text}`}>{message}</p>
            {subMessage && (
              <p className={`text-sm mt-0.5 opacity-80 ${style.text}`}>{subMessage}</p>
            )}
          </div>
          <button
            onClick={() => {
              setIsExiting(true);
              setTimeout(() => onCloseRef.current(), 300);
            }}
            className={`flex-shrink-0 ${style.text} opacity-60 hover:opacity-100 transition-opacity`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Progress bar */}
        <div className={`h-1 ${style.progressBg}`}>
          <div
            className={`h-full ${style.progress} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
