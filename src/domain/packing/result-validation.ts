import { deterministicSort } from "../../lib/deterministic-sort";
import { validateContainerPlacements } from "./placement-validation";
import type { ContainerType, OrderItemUnit, PackingValidation, Placement } from "./types";

const flattenPlacements = (containers: readonly { placements: Placement[] }[]): Placement[] => {
  return containers.flatMap((container) => container.placements);
};

type ValidateResultInput = {
  containers: readonly { containerIndex: number; placements: Placement[] }[];
  containerType: ContainerType;
  expandedOrder: readonly OrderItemUnit[];
  unplacedItemUnitIds: readonly string[];
};

export const validatePackingResult = (input: ValidateResultInput): PackingValidation => {
  const violations: string[] = [];

  for (const container of input.containers) {
    const containerViolations = validateContainerPlacements(
      container.placements,
      input.containerType,
    );
    violations.push(
      ...containerViolations.map(
        (message) => `Container ${container.containerIndex}: ${message}`,
      ),
    );
  }

  const allPlacements = flattenPlacements(input.containers);
  const placedIds = new Set(allPlacements.map((placement) => placement.itemUnitId));
  const expandedIds = input.expandedOrder.map((unit) => unit.unitId);
  const expectedIds = new Set(expandedIds);
  const unplacedIds = new Set(input.unplacedItemUnitIds);

  for (const placedId of placedIds) {
    if (!expectedIds.has(placedId)) {
      violations.push(`Unexpected placed unit: ${placedId}`);
    }
  }

  for (const expectedId of expectedIds) {
    const isPlaced = placedIds.has(expectedId);
    const isUnplaced = unplacedIds.has(expectedId);

    if (!isPlaced && !isUnplaced) {
      violations.push(`Missing unit in result: ${expectedId}`);
    }

    if (isPlaced && isUnplaced) {
      violations.push(`Unit appears in both placed and unplaced: ${expectedId}`);
    }
  }

  const geometryValid = !violations.some(
    (message) => message.includes("Out of bounds") || message.includes("Overlap"),
  );
  const supportValid = !violations.some((message) => message.includes("Unsupported placement"));
  const completenessValid = !violations.some(
    (message) =>
      message.includes("Missing unit") ||
      message.includes("Unexpected placed unit") ||
      message.includes("both placed and unplaced"),
  );

  return {
    geometryValid,
    supportValid,
    completenessValid,
    deterministic: true,
    violations: deterministicSort(violations, (left, right) => left.localeCompare(right)),
  };
};
