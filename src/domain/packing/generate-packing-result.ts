import { CONTAINER_DIMENSIONS, DEFAULT_ORDER_ID, getOrderPresetById } from "@/domain/packing/constants";
import { expandOrder } from "@/domain/packing/expand-order";
import { runPackingEngine } from "@/domain/packing/packing-engine";
import { validatePackingResult } from "@/domain/packing/result-validation";
import { validateOrderSchema, validatePackingResultSchema } from "@/domain/packing/schema-validation";
import { withSummary } from "@/domain/report/summarize-result";
import type { PackingResult } from "@/domain/packing/types";

export const generatePackingResult = (orderId: number = DEFAULT_ORDER_ID): PackingResult => {
  const packingStartedAt = performance.now();
  const orderPreset = getOrderPresetById(orderId);
  const order = validateOrderSchema(orderPreset.order);
  const expandedOrder = expandOrder(order);
  const first = runPackingEngine(expandedOrder, CONTAINER_DIMENSIONS);
  const validation = validatePackingResult({
    containers: first.containers,
    containerType: CONTAINER_DIMENSIONS,
    expandedOrder,
    unplacedItemUnitIds: first.unplacedItemUnitIds,
  });

  const partialResult = {
    usedContainerCount: first.containers.length,
    containers: first.containers,
    unplacedItemUnitIds: first.unplacedItemUnitIds,
    validation,
    timing: {
      packingMs: performance.now() - packingStartedAt,
    },
  };

  return validatePackingResultSchema(withSummary(partialResult, expandedOrder.length));
};
