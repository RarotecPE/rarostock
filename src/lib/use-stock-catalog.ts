"use client";

import { useEffect, useState } from "react";
import { emptyStockCatalog, type StockCatalog } from "@/lib/stock-catalog";

export function useStockCatalog(includeInactive = false) {
  const [catalog, setCatalog] = useState<StockCatalog>(emptyStockCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const url = includeInactive ? "/api/admin/stock-catalog" : "/api/stock-catalog";

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "Nao foi possivel carregar o catalogo.");
        }
        return response.json() as Promise<StockCatalog>;
      })
      .then((data) => {
        if (!active) return;
        setCatalog(data);
        setError("");
      })
      .catch((catalogError) => {
        if (!active) return;
        setError(catalogError instanceof Error ? catalogError.message : "Nao foi possivel carregar o catalogo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [includeInactive]);

  return { catalog, loading, error, setCatalog };
}