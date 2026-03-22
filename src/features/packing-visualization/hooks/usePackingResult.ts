"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { runPackingAsync } from "@/lib/run-packing-async";
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

export type PackingResultState = {
  result: PackingResult | null;
  error: string | null;
  isLoading: boolean;
};

export const usePackingResult = (orderId: number, orderItems: OrderItemType[]) => {
  const [state, setState] = useState<PackingResultState>({
    result: null,
    error: null,
    isLoading: true,
  });

  const requestGenerationRef = useRef(0);

  useEffect(() => {
    const generation = ++requestGenerationRef.current;
    startTransition(() => {
      setState({ result: null, error: null, isLoading: true });
    });

    void runPackingAsync(orderId, orderItems).then(
      (result) => {
        if (generation !== requestGenerationRef.current) {
          return;
        }
        setState({ result, error: null, isLoading: false });
      },
      (loadError: unknown) => {
        if (generation !== requestGenerationRef.current) {
          return;
        }
        setState({
          result: EMPTY_RESULT,
          error: loadError instanceof Error ? loadError.message : "Unknown error",
          isLoading: false,
        });
      },
    );
  }, [orderId, orderItems]);

  return state;
};
