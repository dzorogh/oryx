import { Container, Item, PackingService } from "3d-bin-packing-ts";
import { deterministicSort } from "../../lib/deterministic-sort";
import type { ContainerType, ContainerInstance, OrderItemUnit, Placement } from "./types";

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

  const groupedItems = [...unitsByType.entries()].map(([itemTypeId, itemUnits]) => {
    const sample = itemUnits[0];
    return new Item(
      String(itemTypeId),
      sample.dimensions.width,
      sample.dimensions.height,
      sample.dimensions.length,
      itemUnits.length,
    );
  });

  const packed = PackingService.packIncremental(groupedItems, {
    // IMPORTANT:
    // 3d-bin-packing-ts creates Container as: new Container(id, length, width, height)
    // from packIncremental({ length, height, width }) => Container.height = params.width.
    // We need Container.height to match our container.height (vertical axis in rendering).
    length: container.width,
    height: container.length,
    width: container.height,
  });

  const containers: ContainerInstance[] = packed.results.map((result, index) => {
    const algorithmResult = result.algorithmPackingResults[0];
    const counters = new Map<number, number>();
    const placements: Placement[] = [];

    for (const packedItem of algorithmResult.packedItems) {
      const itemTypeId = Number(packedItem.id);
      const currentCount = (counters.get(itemTypeId) ?? 0) + 1;
      counters.set(itemTypeId, currentCount);
      const sourceUnits = unitsByType.get(itemTypeId) ?? [];
      const sourceUnit = sourceUnits[currentCount - 1];
      if (!sourceUnit) {
        continue;
      }

      const width = packedItem.packDimX;
      const length = packedItem.packDimZ;
      const height = packedItem.packDimY;
      const rotationYaw =
        width === sourceUnit.dimensions.width && length === sourceUnit.dimensions.length ? 0 : 90;

      placements.push({
        containerIndex: index,
        itemUnitId: sourceUnit.unitId,
        itemTypeId,
        position: {
          x: packedItem.coordX,
          y: packedItem.coordZ,
          z: packedItem.coordY,
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

  const placedUnitIds = new Set(containers.flatMap((entry) => entry.placements.map((item) => item.itemUnitId)));
  const unplacedItemUnitIds = deterministicSort(
    units.filter((unit) => !placedUnitIds.has(unit.unitId)).map((unit) => unit.unitId),
    (left, right) => left.localeCompare(right),
  );

  return {
    containers,
    unplacedItemUnitIds,
  };
};
