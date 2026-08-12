"use client";

import { useEffect } from "react";

let activeActionCount = 0;

export function useActionCursor(active: boolean) {
  useEffect(() => {
    if (!active) return;

    activeActionCount += 1;
    document.body.classList.add("action-loading");

    return () => {
      activeActionCount = Math.max(0, activeActionCount - 1);
      if (activeActionCount === 0) {
        document.body.classList.remove("action-loading");
      }
    };
  }, [active]);
}
