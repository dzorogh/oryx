"use client";

import { useEffect, useState } from "react";
import type { PackingResult } from "@/domain/packing/types";
import { validatePackingResultSchema } from "@/domain/packing/schema-validation";

const EMPTY_RESULT: PackingResult = validatePackingResultSchema({
  usedContainerCount: 0,
  containers: [],
  unplacedItemUnitIds: [],
  validation: {
    geometryValid: true,
    supportValid: true,
    completenessValid: true,
    deterministic: true,
    violations: [],
  },
  summary: {
    totalUnits: 0,
    placedUnits: 0,
    unplacedUnits: 0,
  },
  timing: {
    packingMs: 0,
  },
});

export const usePackingResult = (orderId: number) => {
  const [result, setResult] = useState<PackingResult>(EMPTY_RESULT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const handleLoad = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/packing?orderId=${orderId}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        const parsed = validatePackingResultSchema(json);
        if (!mounted) return;
        setResult(parsed);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unknown error");
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    };

    void handleLoad();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  return {
    result,
    isLoading,
    error,
  };
};
