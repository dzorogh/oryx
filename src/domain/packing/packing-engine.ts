import { Container, Item, PackingService } from "3d-bin-packing-ts";
import { deterministicSort } from "../../lib/deterministic-sort";
import type { ContainerType, ContainerInstance, OrderItemUnit, Placement } from "./types";
import { validateContainerPlacements } from "./placement-validation";

export type PackingEngineOutput = {
  containers: ContainerInstance[];
  unplacedItemUnitIds: string[];
};

export const runPackingEngine = (
  units: readonly OrderItemUnit[],
  container: ContainerType,
): PackingEngineOutput => {
  const unitsByType = new Map<number, OrderItemUnit[]>();
  for (const unit of units) {
    const existing = unitsByType.get(unit.itemTypeId) ?? [];
    existing.push(unit);
    unitsByType.set(unit.itemTypeId, existing);
  }
  for (const entry of unitsByType.values()) {
    entry.sort((left, right) => left.unitId.localeCompare(right.unitId));
  }

  type Axis = "X" | "Y" | "Z";
  type AxisMapping = { xAxis: Axis; yAxis: Axis; zAxis: Axis };

  const axisCandidates: AxisMapping[] = [
    { xAxis: "X", yAxis: "Y", zAxis: "Z" },
    { xAxis: "X", yAxis: "Z", zAxis: "Y" },
    { xAxis: "Y", yAxis: "X", zAxis: "Z" },
    { xAxis: "Y", yAxis: "Z", zAxis: "X" },
    { xAxis: "Z", yAxis: "X", zAxis: "Y" },
    { xAxis: "Z", yAxis: "Y", zAxis: "X" },
  ];

  type DimKey = "width" | "length" | "height";
  const dimCandidates: ReadonlyArray<[DimKey, DimKey, DimKey]> = [
    ["width", "length", "height"],
    ["width", "height", "length"],
    ["length", "width", "height"],
    ["length", "height", "width"],
    ["height", "width", "length"],
    ["height", "length", "width"],
  ];

  const expectedHeightByUnitId = new Map(
    units.map((unit) => [unit.unitId, unit.dimensions.height]),
  );

  const getCoordByAxis = (
    packedItem: { coordX: number; coordY: number; coordZ: number },
    axis: Axis,
  ) => {
    if (axis === "X") return packedItem.coordX;
    if (axis === "Y") return packedItem.coordY;
    return packedItem.coordZ;
  };

  const getDimByAxis = (
    packedItem: { packDimX: number; packDimY: number; packDimZ: number },
    axis: Axis,
  ) => {
    if (axis === "X") return packedItem.packDimX;
    if (axis === "Y") return packedItem.packDimY;
    return packedItem.packDimZ;
  };

  const buildForPacked = (
    packed: { results: Array<{ algorithmPackingResults: Array<{ packedItems: any[] }> }> },
    mapping: AxisMapping,
  ): {
    containers: ContainerInstance[];
    sideViolationsCount: number;
    geometryViolationsCount: number;
    placedUnitIds: Set<string>;
  } => {
    const containers = packed.results.map((result, index) => {
      const algorithmResult = result.algorithmPackingResults[0];
      const counters = new Map<number, number>();
      const placements: Placement[] = [];

      for (const packedItem of algorithmResult.packedItems) {
        const itemTypeId = Number(packedItem.id);
        const currentCount = (counters.get(itemTypeId) ?? 0) + 1;
        counters.set(itemTypeId, currentCount);
        const sourceUnits = unitsByType.get(itemTypeId) ?? [];
        const sourceUnit = sourceUnits[currentCount - 1];
        if (!sourceUnit) continue;

        const width = getDimByAxis(packedItem, mapping.xAxis);
        const length = getDimByAxis(packedItem, mapping.yAxis);
        const height = getDimByAxis(packedItem, mapping.zAxis);

        const rotationYaw: 0 | 90 =
          width === sourceUnit.dimensions.width && length === sourceUnit.dimensions.length ? 0 : 90;

        placements.push({
          containerIndex: index,
          itemUnitId: sourceUnit.unitId,
          itemTypeId,
          position: {
            x: getCoordByAxis(packedItem, mapping.xAxis),
            y: getCoordByAxis(packedItem, mapping.yAxis),
            z: getCoordByAxis(packedItem, mapping.zAxis),
          },
          rotationYaw,
          size: {
            width,
            length,
            height,
          },
        });
      }

      return {
        containerIndex: index,
        placements: deterministicSort(
          placements,
          (left, right) => left.position.z - right.position.z,
          (left, right) => left.position.y - right.position.y,
          (left, right) => left.position.x - right.position.x,
        ),
      };
    });

    const sideViolationsCount = containers.reduce((acc, containerInstance) => {
      let count = 0;
      for (const placement of containerInstance.placements) {
        const expectedHeight = expectedHeightByUnitId.get(placement.itemUnitId);
        if (expectedHeight == null) continue;
        if (placement.size.height !== expectedHeight) count += 1;
      }
      return acc + count;
    }, 0);

    const geometryViolationsCount = containers.reduce((acc, containerInstance) => {
      const violations = validateContainerPlacements(containerInstance.placements, container);
      return acc + violations.length;
    }, 0);

    const placedUnitIds = new Set(
      containers.flatMap((entry) => entry.placements.map((item) => item.itemUnitId)),
    );

    return { containers, sideViolationsCount, geometryViolationsCount, placedUnitIds };
  };

  const globalBest: {
    containers: ContainerInstance[];
    sideViolationsCount: number;
    geometryViolationsCount: number;
    placedUnitIds: Set<string>;
  } | null = null;

  let bestContainers: ContainerInstance[] | null = null;
  let bestSideViolationsCount = Number.POSITIVE_INFINITY;
  let bestGeometryViolationsCount = Number.POSITIVE_INFINITY;
  let bestPlacedUnitIds: Set<string> | null = null;

  const containerParamCandidates = [
    { length: container.width, height: container.length, width: container.height },
    { length: container.width, height: container.height, width: container.length },
    { length: container.length, height: container.width, width: container.height },
    { length: container.length, height: container.height, width: container.width },
    { length: container.height, height: container.width, width: container.length },
    { length: container.height, height: container.length, width: container.width },
  ];

  let foundPerfect = false;

  outerLoop: for (const containerParams of containerParamCandidates) {
    for (const [dim1Key, dim2Key, dim3Key] of dimCandidates) {
      const groupedItems = [...unitsByType.entries()].map(([itemTypeId, itemUnits]) => {
        const sample = itemUnits[0];
        const dims = sample.dimensions;
        return new Item(
          String(itemTypeId),
          dims[dim1Key],
          dims[dim2Key],
          dims[dim3Key],
          itemUnits.length,
        );
      });

      const packed = PackingService.packIncremental(groupedItems, containerParams);

      const bestForPacked = axisCandidates
        .map((mapping) => ({ mapping, ...buildForPacked(packed, mapping) }))
        .sort((a, b) => {
          if (a.geometryViolationsCount !== b.geometryViolationsCount) {
            return a.geometryViolationsCount - b.geometryViolationsCount;
          }
          return a.sideViolationsCount - b.sideViolationsCount;
        })[0];

      if (bestForPacked.geometryViolationsCount === 0 && bestForPacked.sideViolationsCount === 0) {
        bestContainers = bestForPacked.containers;
        bestSideViolationsCount = bestForPacked.sideViolationsCount;
        bestGeometryViolationsCount = bestForPacked.geometryViolationsCount;
        bestPlacedUnitIds = bestForPacked.placedUnitIds;
        foundPerfect = true;
        break outerLoop;
      }

      if (
        bestForPacked.geometryViolationsCount < bestGeometryViolationsCount ||
        (bestForPacked.geometryViolationsCount === bestGeometryViolationsCount &&
          bestForPacked.sideViolationsCount < bestSideViolationsCount)
      ) {
        bestContainers = bestForPacked.containers;
        bestSideViolationsCount = bestForPacked.sideViolationsCount;
        bestGeometryViolationsCount = bestForPacked.geometryViolationsCount;
        bestPlacedUnitIds = bestForPacked.placedUnitIds;
      }
    }
    if (foundPerfect) break;
  }

  if (!bestContainers || !bestPlacedUnitIds) {
    // Should never happen: dimCandidates and axisCandidates both cover all mappings.
    return { containers: [], unplacedItemUnitIds: units.map((u) => u.unitId) };
  }

  const unplacedItemUnitIds = deterministicSort(
    units
      .filter((unit) => !bestPlacedUnitIds.has(unit.unitId))
      .map((unit) => unit.unitId),
    (left, right) => left.localeCompare(right),
  );

  return {
    containers: bestContainers,
    unplacedItemUnitIds,
  };
};
