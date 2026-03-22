"use client";

import { useMemo } from "react";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";
import type { OrderItemType, PackingResult } from "@/domain/packing/types";
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

export const usePackingResult = (orderId: number, orderItems: OrderItemType[]) => {
  return useMemo(() => {
    try {
      return {
        result: generatePackingResult(orderId, orderItems),
        error: null as string | null,
      };
    } catch (loadError) {
      return {
        result: EMPTY_RESULT,
        error: loadError instanceof Error ? loadError.message : "Unknown error",
      };
    }
  }, [orderId, orderItems]);
};
