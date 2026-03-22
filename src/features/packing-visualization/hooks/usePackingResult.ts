"use client";

import { useEffect, useState } from "react";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";
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
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    try {
      const next = generatePackingResult(orderId);
      if (!cancelled) {
        setResult(next);
      }
    } catch (loadError) {
      if (!cancelled) {
        setError(loadError instanceof Error ? loadError.message : "Unknown error");
      }
    } finally {
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return {
    result,
    isLoading,
    error,
  };
};
