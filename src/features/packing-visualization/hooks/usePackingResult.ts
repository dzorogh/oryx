"use client";

import { useMemo } from "react";
import { CONTAINER_DIMENSIONS, FIXED_ORDER } from "@/domain/packing/constants";
import { expandOrder } from "@/domain/packing/expand-order";
import { runPackingEngine } from "@/domain/packing/packing-engine";
import { createDeterminismFingerprint, validatePackingResult } from "@/domain/packing/result-validation";
import { validateOrderSchema, validatePackingResultSchema } from "@/domain/packing/schema-validation";
import { withSummary } from "@/domain/report/summarize-result";
import type { PackingResult } from "@/domain/packing/types";

export const generatePackingResult = (): PackingResult => {
  const order = validateOrderSchema(FIXED_ORDER);
  const expandedOrder = expandOrder(order);
  const first = runPackingEngine(expandedOrder, CONTAINER_DIMENSIONS);
  const second = runPackingEngine(expandedOrder, CONTAINER_DIMENSIONS);

  const firstFingerprint = createDeterminismFingerprint(
    first.containers.flatMap((container) => container.placements),
    first.unplacedItemUnitIds,
  );
  const secondFingerprint = createDeterminismFingerprint(
    second.containers.flatMap((container) => container.placements),
    second.unplacedItemUnitIds,
  );

  const deterministic = firstFingerprint === secondFingerprint;
  const validation = validatePackingResult({
    containers: first.containers,
    containerType: CONTAINER_DIMENSIONS,
    expandedOrder,
    unplacedItemUnitIds: first.unplacedItemUnitIds,
    deterministic,
  });

  const partialResult = {
    usedContainerCount: first.containers.length,
    containers: first.containers,
    unplacedItemUnitIds: first.unplacedItemUnitIds,
    validation,
  };

  return validatePackingResultSchema(withSummary(partialResult, expandedOrder.length));
};

export const usePackingResult = () => {
  const result = useMemo(() => generatePackingResult(), []);

  return {
    result,
    isLoading: false,
    error: null as string | null
  };
};
