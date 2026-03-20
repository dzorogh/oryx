import { deterministicSort } from "../../lib/deterministic-sort";
import type { ContainerType, ContainerInstance, OrderItemUnit, Placement } from "./types";

export type PackingEngineOutput = {
  containers: ContainerInstance[];
  unplacedItemUnitIds: string[];
};

type FreeRect = { x: number; y: number; width: number; length: number };
type Layer = {
  z: number;
  height: number;
  freeRects: FreeRect[];
  placements: Placement[];
};

const sortFreeRects = (freeRects: readonly FreeRect[]) =>
  deterministicSort(
    [...freeRects],
    (left, right) => left.y - right.y,
    (left, right) => left.x - right.x,
    (left, right) => right.width * right.length - left.width * left.length,
  );

const splitFreeRect = (
  rect: FreeRect,
  placedSize: { width: number; length: number },
): FreeRect[] => {
  const result: FreeRect[] = [];
  const rightWidth = rect.width - placedSize.width;
  const frontLength = rect.length - placedSize.length;

  if (rightWidth > 0) {
    result.push({
      x: rect.x + placedSize.width,
      y: rect.y,
      width: rightWidth,
      length: placedSize.length,
    });
  }
  if (frontLength > 0) {
    result.push({
      x: rect.x,
      y: rect.y + placedSize.length,
      width: rect.width,
      length: frontLength,
    });
  }
  return result;
};

const mergeAdjacentRects = (rects: readonly FreeRect[]): FreeRect[] => {
  if (rects.length <= 1) return [...rects];

  let current = deterministicSort(
    [...rects],
    (left, right) => left.y - right.y,
    (left, right) => left.x - right.x,
    (left, right) => left.width - right.width,
    (left, right) => left.length - right.length,
  );

  let changed = true;
  while (changed) {
    changed = false;
    const next: FreeRect[] = [];
    const consumed = new Set<number>();

    for (let index = 0; index < current.length; index += 1) {
      if (consumed.has(index)) continue;
      let merged = current[index];

      for (let candidateIndex = index + 1; candidateIndex < current.length; candidateIndex += 1) {
        if (consumed.has(candidateIndex)) continue;
        const candidate = current[candidateIndex];

        const canMergeHorizontally =
          merged.y === candidate.y &&
          merged.length === candidate.length &&
          merged.x + merged.width === candidate.x;

        if (canMergeHorizontally) {
          merged = {
            x: merged.x,
            y: merged.y,
            width: merged.width + candidate.width,
            length: merged.length,
          };
          consumed.add(candidateIndex);
          changed = true;
          continue;
        }

        const canMergeVertically =
          merged.x === candidate.x &&
          merged.width === candidate.width &&
          merged.y + merged.length === candidate.y;

        if (canMergeVertically) {
          merged = {
            x: merged.x,
            y: merged.y,
            width: merged.width,
            length: merged.length + candidate.length,
          };
          consumed.add(candidateIndex);
          changed = true;
        }
      }

      next.push(merged);
    }

    current = deterministicSort(
      next,
      (left, right) => left.y - right.y,
      (left, right) => left.x - right.x,
      (left, right) => left.width - right.width,
      (left, right) => left.length - right.length,
    );
  }

  return current;
};

const supportRectsAtZ = (layers: readonly Layer[], targetZ: number): FreeRect[] => {
  const supportRects = layers
    .flatMap((layer) => layer.placements)
    .filter((placement) => placement.position.z + placement.size.height === targetZ)
    .map((placement) => ({
      x: placement.position.x,
      y: placement.position.y,
      width: placement.size.width,
      length: placement.size.length,
    }));
  return mergeAdjacentRects(supportRects);
};

const pickNextLayerHeight = (
  remaining: readonly OrderItemUnit[],
  availableHeight: number,
): number | null => {
  const scoreByHeight = new Map<number, number>();
  for (const unit of remaining) {
    const h = unit.dimensions.height;
    if (h > availableHeight) continue;
    const area = unit.dimensions.width * unit.dimensions.length;
    scoreByHeight.set(h, (scoreByHeight.get(h) ?? 0) + area);
  }
  if (scoreByHeight.size === 0) return null;

  const heights = [...scoreByHeight.keys()];
  heights.sort((left, right) => {
    const scoreDiff = (scoreByHeight.get(right) ?? 0) - (scoreByHeight.get(left) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return right - left;
  });
  return heights[0] ?? null;
};

const tryPlaceInLayer = (
  layer: Layer,
  unit: OrderItemUnit,
  containerIndex: number,
):
  | {
      placement: Placement;
      nextFreeRects: FreeRect[];
      wasteArea: number;
      wasteWidth: number;
      wasteLength: number;
    }
  | null => {
  if (unit.dimensions.height > layer.height) return null;

  const orientations: ReadonlyArray<{ width: number; length: number; yaw: 0 | 90 }> = [
    { width: unit.dimensions.width, length: unit.dimensions.length, yaw: 0 },
    { width: unit.dimensions.length, length: unit.dimensions.width, yaw: 90 },
  ];

  let best:
    | {
        placement: Placement;
        nextFreeRects: FreeRect[];
        wasteArea: number;
        wasteWidth: number;
        wasteLength: number;
      }
    | null = null;

  for (const freeRect of sortFreeRects(layer.freeRects)) {
    for (const orientation of orientations) {
      if (orientation.width > freeRect.width || orientation.length > freeRect.length) continue;

      const placement: Placement = {
        containerIndex,
        itemUnitId: unit.unitId,
        itemTypeId: unit.itemTypeId,
        position: { x: freeRect.x, y: freeRect.y, z: layer.z },
        rotationYaw: orientation.yaw,
        size: {
          width: orientation.width,
          length: orientation.length,
          height: unit.dimensions.height,
        },
      };

      const nextFreeRects = sortFreeRects([
        ...layer.freeRects.filter((entry) => entry !== freeRect),
        ...splitFreeRect(freeRect, orientation),
      ]);

      const wasteArea = freeRect.width * freeRect.length - orientation.width * orientation.length;
      const wasteWidth = freeRect.width - orientation.width;
      const wasteLength = freeRect.length - orientation.length;

      if (!best) {
        best = { placement, nextFreeRects, wasteArea, wasteWidth, wasteLength };
        continue;
      }

      if (wasteArea < best.wasteArea) {
        best = { placement, nextFreeRects, wasteArea, wasteWidth, wasteLength };
        continue;
      }
      if (wasteArea === best.wasteArea && wasteWidth + wasteLength < best.wasteWidth + best.wasteLength) {
        best = { placement, nextFreeRects, wasteArea, wasteWidth, wasteLength };
      }
    }
  }

  if (!best) return null;
  return {
    placement: best.placement,
    nextFreeRects: best.nextFreeRects,
    wasteArea: best.wasteArea,
    wasteWidth: best.wasteWidth,
    wasteLength: best.wasteLength,
  };
};

export const runPackingEngine = (
  units: readonly OrderItemUnit[],
  container: ContainerType,
): PackingEngineOutput => {
  const volumeOf = (unit: OrderItemUnit): number =>
    unit.dimensions.width * unit.dimensions.length * unit.dimensions.height;
  const footprintOf = (unit: OrderItemUnit): number => unit.dimensions.width * unit.dimensions.length;
  const placementCenter = (placement: Placement): { x: number; y: number; z: number } => ({
    x: placement.position.x + placement.size.width / 2,
    y: placement.position.y + placement.size.length / 2,
    z: placement.position.z + placement.size.height / 2,
  });
  const clusteringPenalty = (
    placements: readonly Placement[],
    itemTypeId: number,
    candidatePlacement: Placement,
  ): number => {
    const sameTypePlacements = placements.filter((entry) => entry.itemTypeId === itemTypeId);
    if (sameTypePlacements.length === 0) return 0;

    const candidateCenter = placementCenter(candidatePlacement);
    return sameTypePlacements.reduce((sum, placedEntry) => {
      const center = placementCenter(placedEntry);
      return (
        sum +
        Math.abs(candidateCenter.x - center.x) +
        Math.abs(candidateCenter.y - center.y) +
        Math.abs(candidateCenter.z - center.z)
      );
    }, 0);
  };
  const newTypeInContainerPenalty = (
    placements: readonly Placement[],
    itemTypeId: number,
  ): number => {
    if (placements.length === 0) return 0;
    return placements.some((entry) => entry.itemTypeId === itemTypeId) ? 0 : 1;
  };

  const sortStrategies: ReadonlyArray<(unitsToSort: readonly OrderItemUnit[]) => OrderItemUnit[]> = [
    (unitsToSort) =>
      deterministicSort(
        [...unitsToSort],
        (left, right) => footprintOf(right) - footprintOf(left),
        (left, right) => right.dimensions.height - left.dimensions.height,
        (left, right) => left.itemTypeId - right.itemTypeId,
        (left, right) => left.unitId.localeCompare(right.unitId),
      ),
    (unitsToSort) =>
      deterministicSort(
        [...unitsToSort],
        (left, right) => right.dimensions.height - left.dimensions.height,
        (left, right) => footprintOf(right) - footprintOf(left),
        (left, right) => left.itemTypeId - right.itemTypeId,
        (left, right) => left.unitId.localeCompare(right.unitId),
      ),
    (unitsToSort) =>
      deterministicSort(
        [...unitsToSort],
        (left, right) => volumeOf(right) - volumeOf(left),
        (left, right) => footprintOf(right) - footprintOf(left),
        (left, right) => right.dimensions.length - left.dimensions.length,
        (left, right) => right.dimensions.width - left.dimensions.width,
        (left, right) => left.itemTypeId - right.itemTypeId,
        (left, right) => left.unitId.localeCompare(right.unitId),
      ),
    (unitsToSort) =>
      deterministicSort(
        [...unitsToSort],
        (left, right) => right.dimensions.length - left.dimensions.length,
        (left, right) => right.dimensions.width - left.dimensions.width,
        (left, right) => right.dimensions.height - left.dimensions.height,
        (left, right) => footprintOf(right) - footprintOf(left),
        (left, right) => left.itemTypeId - right.itemTypeId,
        (left, right) => left.unitId.localeCompare(right.unitId),
      ),
    (unitsToSort) =>
      deterministicSort(
        [...unitsToSort],
        (left, right) => right.dimensions.width - left.dimensions.width,
        (left, right) => right.dimensions.length - left.dimensions.length,
        (left, right) => right.dimensions.height - left.dimensions.height,
        (left, right) => footprintOf(right) - footprintOf(left),
        (left, right) => left.itemTypeId - right.itemTypeId,
        (left, right) => left.unitId.localeCompare(right.unitId),
      ),
    (unitsToSort) =>
      deterministicSort(
        [...unitsToSort],
        (left, right) => footprintOf(left) - footprintOf(right),
        (left, right) => left.dimensions.height - right.dimensions.height,
        (left, right) => left.itemTypeId - right.itemTypeId,
        (left, right) => left.unitId.localeCompare(right.unitId),
      ),
    (unitsToSort) =>
      deterministicSort(
        [...unitsToSort],
        (left, right) => left.dimensions.height - right.dimensions.height,
        (left, right) => footprintOf(left) - footprintOf(right),
        (left, right) => left.itemTypeId - right.itemTypeId,
        (left, right) => left.unitId.localeCompare(right.unitId),
      ),
    (unitsToSort) =>
      deterministicSort(
        [...unitsToSort],
        (left, right) => volumeOf(left) - volumeOf(right),
        (left, right) => footprintOf(left) - footprintOf(right),
        (left, right) => left.itemTypeId - right.itemTypeId,
        (left, right) => left.unitId.localeCompare(right.unitId),
      ),
  ];

  const packWithLimit = (
    baseUnits: readonly OrderItemUnit[],
    containerLimit: number,
  ): PackingEngineOutput => {
    const remaining = [...baseUnits];
    const containerInstances: ContainerInstance[] = [];

    let containerIndex = 0;
    while (remaining.length > 0 && containerIndex < containerLimit) {
      const layers: Layer[] = [];
      const placements: Placement[] = [];

      let placedInPass = true;
      while (placedInPass) {
        placedInPass = false;

        // 1) Try to place best next unit in existing layers.
        let bestExisting:
          | {
              unitIndex: number;
              layerIndex: number;
              placed: {
                placement: Placement;
                nextFreeRects: FreeRect[];
                wasteArea: number;
                wasteWidth: number;
                wasteLength: number;
              };
              area: number;
            }
          | null = null;

        for (let unitIndex = 0; unitIndex < remaining.length; unitIndex += 1) {
          const unit = remaining[unitIndex];
          for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
            const placed = tryPlaceInLayer(layers[layerIndex], unit, containerIndex);
            if (!placed) continue;
            const area = placed.placement.size.width * placed.placement.size.length;
            if (!bestExisting || area > bestExisting.area) {
              bestExisting = { unitIndex, layerIndex, placed, area };
            }
          }
        }

        if (bestExisting) {
          const layer = layers[bestExisting.layerIndex];
          layers[bestExisting.layerIndex] = {
            ...layer,
            freeRects: bestExisting.placed.nextFreeRects,
            placements: [...layer.placements, bestExisting.placed.placement],
          };
          placements.push(bestExisting.placed.placement);
          remaining.splice(bestExisting.unitIndex, 1);
          placedInPass = true;
          continue;
        }

        // 2) If no fit in existing layers, open a new best layer.
        const nextLayerZ = layers.reduce((sum, layer) => sum + layer.height, 0);
        const availableHeight = container.height - nextLayerZ;
        const nextLayerHeight = pickNextLayerHeight(remaining, availableHeight);
        if (nextLayerHeight == null) {
          break;
        }

        const baseRects: FreeRect[] =
          layers.length === 0
            ? [{ x: 0, y: 0, width: container.width, length: container.length }]
            : supportRectsAtZ(layers, nextLayerZ);
        if (baseRects.length === 0) {
          break;
        }

        const newLayer: Layer = {
          z: nextLayerZ,
          height: nextLayerHeight,
          freeRects: sortFreeRects(baseRects),
          placements: [],
        };

        let bestNewLayer:
          | {
              unitIndex: number;
              placed: {
                placement: Placement;
                nextFreeRects: FreeRect[];
                wasteArea: number;
                wasteWidth: number;
                wasteLength: number;
              };
              area: number;
            }
          | null = null;

        for (let unitIndex = 0; unitIndex < remaining.length; unitIndex += 1) {
          const unit = remaining[unitIndex];
          if (unit.dimensions.height > nextLayerHeight) continue;
          const placed = tryPlaceInLayer(newLayer, unit, containerIndex);
          if (!placed) continue;
          const area = placed.placement.size.width * placed.placement.size.length;
          if (!bestNewLayer || area > bestNewLayer.area) {
            bestNewLayer = { unitIndex, placed, area };
          }
        }

        if (!bestNewLayer) {
          break;
        }

        layers.push({
          ...newLayer,
          freeRects: bestNewLayer.placed.nextFreeRects,
          placements: [bestNewLayer.placed.placement],
        });
        placements.push(bestNewLayer.placed.placement);
        remaining.splice(bestNewLayer.unitIndex, 1);
        placedInPass = true;
      }

      if (placements.length === 0) break;
      containerInstances.push({
        containerIndex,
        placements: deterministicSort(
          placements,
          (left, right) => left.position.z - right.position.z,
          (left, right) => left.position.y - right.position.y,
          (left, right) => left.position.x - right.position.x,
        ),
      });
      containerIndex += 1;
    }

    return {
      containers: containerInstances,
      unplacedItemUnitIds: deterministicSort(
        remaining.map((unit) => unit.unitId),
        (left, right) => left.localeCompare(right),
      ),
    };
  };

  const packAcrossContainers = (
    baseUnits: readonly OrderItemUnit[],
    containerLimit: number,
  ): PackingEngineOutput => {
    type ContainerState = {
      containerIndex: number;
      layers: Layer[];
      placements: Placement[];
    };

    const states: ContainerState[] = Array.from({ length: containerLimit }, (_, index) => ({
      containerIndex: index,
      layers: [],
      placements: [],
    }));
    const unplacedItemUnitIds: string[] = [];

    for (const unit of baseUnits) {
      let best:
        | {
            containerIndex: number;
            layerIndex: number | null;
            isNewLayer: boolean;
            newLayer: Layer | null;
            placed: {
              placement: Placement;
              nextFreeRects: FreeRect[];
              wasteArea: number;
              wasteWidth: number;
              wasteLength: number;
            };
            score: [number, number, number, number, number, number, number, number];
          }
        | null = null;

      for (let stateIndex = 0; stateIndex < states.length; stateIndex += 1) {
        const state = states[stateIndex];

        for (let layerIndex = 0; layerIndex < state.layers.length; layerIndex += 1) {
          const layer = state.layers[layerIndex];
          const placed = tryPlaceInLayer(layer, unit, state.containerIndex);
          if (!placed) continue;

          const score: [number, number, number, number, number, number, number, number] = [
            0,
            newTypeInContainerPenalty(state.placements, unit.itemTypeId),
            placed.wasteArea,
            placed.wasteWidth + placed.wasteLength,
            clusteringPenalty(state.placements, unit.itemTypeId, placed.placement),
            placed.placement.position.z,
            -state.placements.length,
            state.containerIndex,
          ];

          if (!best) {
            best = {
              containerIndex: stateIndex,
              layerIndex,
              isNewLayer: false,
              newLayer: null,
              placed,
              score,
            };
            continue;
          }

          const isBetter =
            score[0] < best.score[0] ||
            (score[0] === best.score[0] && score[1] < best.score[1]) ||
            (score[0] === best.score[0] && score[1] === best.score[1] && score[2] < best.score[2]) ||
            (score[0] === best.score[0] &&
              score[1] === best.score[1] &&
              score[2] === best.score[2] &&
              score[3] < best.score[3]) ||
            (score[0] === best.score[0] &&
              score[1] === best.score[1] &&
              score[2] === best.score[2] &&
              score[3] === best.score[3] &&
              score[4] < best.score[4]) ||
            (score[0] === best.score[0] &&
              score[1] === best.score[1] &&
              score[2] === best.score[2] &&
              score[3] === best.score[3] &&
              score[4] === best.score[4] &&
              score[5] < best.score[5]) ||
            (score[0] === best.score[0] &&
              score[1] === best.score[1] &&
              score[2] === best.score[2] &&
              score[3] === best.score[3] &&
              score[4] === best.score[4] &&
              score[5] === best.score[5] &&
              score[6] < best.score[6]) ||
            (score[0] === best.score[0] &&
              score[1] === best.score[1] &&
              score[2] === best.score[2] &&
              score[3] === best.score[3] &&
              score[4] === best.score[4] &&
              score[5] === best.score[5] &&
              score[6] === best.score[6] &&
              score[7] < best.score[7]);

          if (isBetter) {
            best = {
              containerIndex: stateIndex,
              layerIndex,
              isNewLayer: false,
              newLayer: null,
              placed,
              score,
            };
          }
        }

        const supportZLevels = deterministicSort(
          [
            0,
            ...state.placements.map((placement) => placement.position.z + placement.size.height),
          ],
          (left, right) => left - right,
        ).filter((value, index, source) => source.indexOf(value) === index);

        for (const layerZ of supportZLevels) {
          if (state.layers.some((layer) => layer.z === layerZ)) {
            continue;
          }
          if (layerZ + unit.dimensions.height > container.height) {
            continue;
          }

          const baseRects: FreeRect[] =
            layerZ === 0
              ? [{ x: 0, y: 0, width: container.width, length: container.length }]
              : supportRectsAtZ(state.layers, layerZ);
          if (baseRects.length === 0) {
            continue;
          }

          const newLayer: Layer = {
            z: layerZ,
            height: unit.dimensions.height,
            freeRects: sortFreeRects(baseRects),
            placements: [],
          };
          const placedInNewLayer = tryPlaceInLayer(newLayer, unit, state.containerIndex);
          if (!placedInNewLayer) {
            continue;
          }

          const newLayerScore: [number, number, number, number, number, number, number, number] = [
            1,
            newTypeInContainerPenalty(state.placements, unit.itemTypeId),
            placedInNewLayer.wasteArea,
            placedInNewLayer.wasteWidth + placedInNewLayer.wasteLength,
            clusteringPenalty(state.placements, unit.itemTypeId, placedInNewLayer.placement),
            placedInNewLayer.placement.position.z,
            -state.placements.length,
            state.containerIndex,
          ];

          if (!best) {
            best = {
              containerIndex: stateIndex,
              layerIndex: null,
              isNewLayer: true,
              newLayer,
              placed: placedInNewLayer,
              score: newLayerScore,
            };
            continue;
          }

          const isBetterNewLayer =
            newLayerScore[0] < best.score[0] ||
            (newLayerScore[0] === best.score[0] && newLayerScore[1] < best.score[1]) ||
            (newLayerScore[0] === best.score[0] &&
              newLayerScore[1] === best.score[1] &&
              newLayerScore[2] < best.score[2]) ||
            (newLayerScore[0] === best.score[0] &&
              newLayerScore[1] === best.score[1] &&
              newLayerScore[2] === best.score[2] &&
              newLayerScore[3] < best.score[3]) ||
            (newLayerScore[0] === best.score[0] &&
              newLayerScore[1] === best.score[1] &&
              newLayerScore[2] === best.score[2] &&
              newLayerScore[3] === best.score[3] &&
              newLayerScore[4] < best.score[4]) ||
            (newLayerScore[0] === best.score[0] &&
              newLayerScore[1] === best.score[1] &&
              newLayerScore[2] === best.score[2] &&
              newLayerScore[3] === best.score[3] &&
              newLayerScore[4] === best.score[4] &&
              newLayerScore[5] < best.score[5]) ||
            (newLayerScore[0] === best.score[0] &&
              newLayerScore[1] === best.score[1] &&
              newLayerScore[2] === best.score[2] &&
              newLayerScore[3] === best.score[3] &&
              newLayerScore[4] === best.score[4] &&
              newLayerScore[5] === best.score[5] &&
              newLayerScore[6] < best.score[6]) ||
            (newLayerScore[0] === best.score[0] &&
              newLayerScore[1] === best.score[1] &&
              newLayerScore[2] === best.score[2] &&
              newLayerScore[3] === best.score[3] &&
              newLayerScore[4] === best.score[4] &&
              newLayerScore[5] === best.score[5] &&
              newLayerScore[6] === best.score[6] &&
              newLayerScore[7] < best.score[7]);

          if (isBetterNewLayer) {
            best = {
              containerIndex: stateIndex,
              layerIndex: null,
              isNewLayer: true,
              newLayer,
              placed: placedInNewLayer,
              score: newLayerScore,
            };
          }
        }
      }

      if (!best) {
        unplacedItemUnitIds.push(unit.unitId);
        continue;
      }

      const targetState = states[best.containerIndex];
      if (best.isNewLayer) {
        if (!best.newLayer) {
          unplacedItemUnitIds.push(unit.unitId);
          continue;
        }
        targetState.layers.push({
          ...best.newLayer,
          freeRects: best.placed.nextFreeRects,
          placements: [best.placed.placement],
        });
      } else if (best.layerIndex != null) {
        const layer = targetState.layers[best.layerIndex];
        targetState.layers[best.layerIndex] = {
          ...layer,
          freeRects: best.placed.nextFreeRects,
          placements: [...layer.placements, best.placed.placement],
        };
      }
      targetState.placements.push(best.placed.placement);
    }

    const containers = states
      .filter((state) => state.placements.length > 0)
      .map((state) => ({
        containerIndex: state.containerIndex,
        placements: deterministicSort(
          state.placements,
          (left, right) => left.position.z - right.position.z,
          (left, right) => left.position.y - right.position.y,
          (left, right) => left.position.x - right.position.x,
        ),
      }));

    return {
      containers,
      unplacedItemUnitIds: deterministicSort(
        unplacedItemUnitIds,
        (left, right) => left.localeCompare(right),
      ),
    };
  };

  const compareResults = (left: PackingEngineOutput, right: PackingEngineOutput): number => {
    if (left.unplacedItemUnitIds.length !== right.unplacedItemUnitIds.length) {
      return left.unplacedItemUnitIds.length - right.unplacedItemUnitIds.length;
    }
    if (left.containers.length !== right.containers.length) {
      return left.containers.length - right.containers.length;
    }

    const leftPlacementCount = left.containers.reduce(
      (sum, containerInstance) => sum + containerInstance.placements.length,
      0,
    );
    const rightPlacementCount = right.containers.reduce(
      (sum, containerInstance) => sum + containerInstance.placements.length,
      0,
    );
    if (leftPlacementCount !== rightPlacementCount) {
      return rightPlacementCount - leftPlacementCount;
    }

    return 0;
  };

  let bestResult: PackingEngineOutput | null = null;

  for (const sortStrategy of sortStrategies) {
    const baseUnits = sortStrategy(units);
    const greedyResult = packWithLimit(baseUnits, units.length);

    let strategyBest = greedyResult;
    if (greedyResult.unplacedItemUnitIds.length === 0 && greedyResult.containers.length > 1) {
      for (let limit = 1; limit < greedyResult.containers.length; limit += 1) {
        const candidatesForLimit = [packAcrossContainers(baseUnits, limit), packWithLimit(baseUnits, limit)];
        const fullyPlacedCandidates = candidatesForLimit.filter(
          (candidate) => candidate.unplacedItemUnitIds.length === 0,
        );
        if (fullyPlacedCandidates.length > 0) {
          const bestForLimit = fullyPlacedCandidates.reduce((bestCandidate, currentCandidate) =>
            compareResults(currentCandidate, bestCandidate) < 0 ? currentCandidate : bestCandidate,
          );
          strategyBest = bestForLimit;
          break;
        }
      }
    }

    if (!bestResult || compareResults(strategyBest, bestResult) < 0) {
      bestResult = strategyBest;
    }
  }

  return bestResult ?? { containers: [], unplacedItemUnitIds: [] };
};
