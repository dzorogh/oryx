import { CONTAINER_DIMENSIONS, DEFAULT_ORDER_ID, getOrderPresetById } from "@/domain/packing/constants";
import { expandOrder } from "@/domain/packing/expand-order";
import { runPackingEngine } from "@/domain/packing/packing-engine";
import { createDeterminismFingerprint, validatePackingResult } from "@/domain/packing/result-validation";
import { validateOrderSchema, validatePackingResultSchema } from "@/domain/packing/schema-validation";
import { withSummary } from "@/domain/report/summarize-result";
import type { PackingResult } from "@/domain/packing/types";

export const generatePackingResult = (orderId: number = DEFAULT_ORDER_ID): PackingResult => {
  const orderPreset = getOrderPresetById(orderId);
  const order = validateOrderSchema(orderPreset.order);
  const expandedOrder = expandOrder(order);
  const first = runPackingEngine(expandedOrder, CONTAINER_DIMENSIONS);
  const strictDeterminismCheck =
    process.env.NODE_ENV === "test" || process.env.PACKING_STRICT_DETERMINISM === "1";

  const deterministic = (() => {
    if (!strictDeterminismCheck) {
      // Runtime UX-first path: avoid doubling heavy solver work on page load.
      return true;
    }
    const second = runPackingEngine(expandedOrder, CONTAINER_DIMENSIONS);
    const firstFingerprint = createDeterminismFingerprint(
      first.containers.flatMap((container) => container.placements),
      first.unplacedItemUnitIds,
    );
    const secondFingerprint = createDeterminismFingerprint(
      second.containers.flatMap((container) => container.placements),
      second.unplacedItemUnitIds,
    );
    return firstFingerprint === secondFingerprint;
  })();
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
