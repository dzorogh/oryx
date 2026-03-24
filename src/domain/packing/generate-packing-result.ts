import { CONTAINER_DIMENSIONS, DEFAULT_ORDER_ID, getOrderPresetById } from "@/domain/packing/constants";
import { expandOrder } from "@/domain/packing/expand-order";
import { getOversizedOrderViolations } from "@/domain/packing/order-container-fit";
import { runPackingEngine } from "@/domain/packing/packing-engine";
import { validatePackingResult } from "@/domain/packing/result-validation";
import { validateOrderSchema, validatePackingResultSchema } from "@/domain/packing/schema-validation";
import { buildPostCheck, withSummary } from "@/domain/report/summarize-result";
import type { OrderItemType, PackingResult } from "@/domain/packing/types";
import { deterministicSort } from "@/lib/deterministic-sort";

export const generatePackingResult = (
  orderId: number = DEFAULT_ORDER_ID,
  orderOverride?: OrderItemType[],
): PackingResult => {
  const packingStartedAt = performance.now();
  const orderPreset = getOrderPresetById(orderId);
  const order = validateOrderSchema(orderOverride ?? orderPreset.order);
  const expandedOrder = expandOrder(order);
  const oversizedViolations = getOversizedOrderViolations(order, CONTAINER_DIMENSIONS);
  const first = runPackingEngine(expandedOrder, CONTAINER_DIMENSIONS);
  const validationFromEngine = validatePackingResult({
    containers: first.containers,
    containerType: CONTAINER_DIMENSIONS,
    expandedOrder,
    unplacedItemUnitIds: first.unplacedItemUnitIds,
  });
  const validation = {
    ...validationFromEngine,
    geometryValid: validationFromEngine.geometryValid && oversizedViolations.length === 0,
    violations: deterministicSort(
      [...oversizedViolations, ...validationFromEngine.violations],
      (left, right) => left.localeCompare(right),
    ),
  };

  const partialResult = {
    usedContainerCount: first.containers.length,
    containers: first.containers,
    unplacedItemUnitIds: first.unplacedItemUnitIds,
    validation,
    postCheck: buildPostCheck(first.containers, CONTAINER_DIMENSIONS),
    timing: {
      packingMs: performance.now() - packingStartedAt,
    },
  };

  return validatePackingResultSchema(withSummary(partialResult, expandedOrder.length));
};
