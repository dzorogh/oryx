import { deterministicSort } from "../../lib/deterministic-sort";
import { placementsOverlap } from "./placement-validation";
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
type TryPlaceResult = {
  placement: Placement;
  nextFreeRects: FreeRect[];
  wasteArea: number;
  wasteWidth: number;
  wasteLength: number;
};
type PackingProfile = "balanced" | "dense";
type ContainerState = {
  containerIndex: number;
  layers: Layer[];
  placements: Placement[];
};

const LAYER_HEIGHT_GROUPING_TOLERANCE_MM = 20;
const SUPPORT_HEIGHT_GAP_TOLERANCE_MM = LAYER_HEIGHT_GROUPING_TOLERANCE_MM;

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
    .filter((placement) => {
      const topZ = placement.position.z + placement.size.height;
      return topZ <= targetZ && targetZ - topZ <= SUPPORT_HEIGHT_GAP_TOLERANCE_MM;
    })
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
  const candidateHeights = deterministicSort(
    [...new Set(remaining.map((unit) => unit.dimensions.height).filter((height) => height <= availableHeight))],
    (left, right) => left - right,
  );
  if (candidateHeights.length === 0) return null;

  const scoreByNormalizedHeight = new Map<number, number>();
  for (const unit of remaining) {
    const unitHeight = unit.dimensions.height;
    if (unitHeight > availableHeight) continue;
    const normalizedHeight =
      candidateHeights.find(
        (candidateHeight) =>
          candidateHeight >= unitHeight &&
          candidateHeight - unitHeight <= LAYER_HEIGHT_GROUPING_TOLERANCE_MM,
      ) ?? unitHeight;
    const area = unit.dimensions.width * unit.dimensions.length;
    scoreByNormalizedHeight.set(
      normalizedHeight,
      (scoreByNormalizedHeight.get(normalizedHeight) ?? 0) + area,
    );
  }
  if (scoreByNormalizedHeight.size === 0) return null;

  const normalizedHeights = [...scoreByNormalizedHeight.keys()];
  normalizedHeights.sort((left, right) => {
    const scoreDiff =
      (scoreByNormalizedHeight.get(right) ?? 0) - (scoreByNormalizedHeight.get(left) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return right - left;
  });
  return normalizedHeights[0] ?? null;
};

const normalizeLayerHeight = (
  unitHeight: number,
  allUnits: readonly OrderItemUnit[],
  availableHeight: number,
): number => {
  const candidate = deterministicSort(
    [...new Set(allUnits.map((unit) => unit.dimensions.height))],
    (left, right) => left - right,
  ).find(
    (height) =>
      height >= unitHeight &&
      height <= availableHeight &&
      height - unitHeight <= LAYER_HEIGHT_GROUPING_TOLERANCE_MM,
  );
  return candidate ?? unitHeight;
};

const sortPlacements = (placements: readonly Placement[]): Placement[] =>
  deterministicSort(
    [...placements],
    (left, right) => left.position.z - right.position.z,
    (left, right) => left.position.y - right.position.y,
    (left, right) => left.position.x - right.position.x,
  );

const getSupportZLevels = (placements: readonly Placement[]): number[] =>
  deterministicSort(
    [0, ...placements.map((placement) => placement.position.z + placement.size.height)],
    (left, right) => left - right,
  ).filter((value, index, source) => source.indexOf(value) === index);

const getBaseRectsForLayer = (
  layerZ: number,
  layers: readonly Layer[],
  container: ContainerType,
): FreeRect[] => {
  if (layerZ === 0) {
    return [{ x: 0, y: 0, width: container.width, length: container.length }];
  }
  return supportRectsAtZ(layers, layerZ);
};

const countPlacements = (containers: readonly ContainerInstance[]): number =>
  containers.reduce((sum, containerInstance) => sum + containerInstance.placements.length, 0);

const tryPlaceInLayer = (
  layer: Layer,
  unit: OrderItemUnit,
  containerIndex: number,
): TryPlaceResult | null => {
  if (unit.dimensions.height > layer.height) return null;

  const orientations: ReadonlyArray<{ width: number; length: number; yaw: 0 | 90 }> = [
    { width: unit.dimensions.width, length: unit.dimensions.length, yaw: 0 },
    { width: unit.dimensions.length, length: unit.dimensions.width, yaw: 90 },
  ];

  let best: TryPlaceResult | null = null;

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

const newTypeInContainerPenalty = (placements: readonly Placement[], itemTypeId: number): number => {
  if (placements.length === 0) return 0;
  return placements.some((entry) => entry.itemTypeId === itemTypeId) ? 0 : 1;
};

const containerEnvelopePenalty = (
  placements: readonly Placement[],
  candidatePlacement: Placement,
): number => {
  const allPlacements = [...placements, candidatePlacement];
  const maxX = allPlacements.reduce(
    (maxValue, placement) => Math.max(maxValue, placement.position.x + placement.size.width),
    0,
  );
  const maxY = allPlacements.reduce(
    (maxValue, placement) => Math.max(maxValue, placement.position.y + placement.size.length),
    0,
  );
  const maxZ = allPlacements.reduce(
    (maxValue, placement) => Math.max(maxValue, placement.position.z + placement.size.height),
    0,
  );
  return maxX * maxY * maxZ;
};

const yFrontGapPenalty = (placements: readonly Placement[], candidatePlacement: Placement): number => {
  if (placements.length === 0) return 0;
  const currentFrontY = placements.reduce(
    (maxValue, placement) => Math.max(maxValue, placement.position.y + placement.size.length),
    0,
  );
  const candidateStartY = candidatePlacement.position.y;
  if (candidateStartY <= currentFrontY) return 0;
  return candidateStartY - currentFrontY;
};

const normalizeContainerOrder = (containers: readonly ContainerInstance[]): ContainerInstance[] => {
  const sorted = deterministicSort(
    [...containers],
    (left, right) => right.placements.length - left.placements.length,
    (left, right) =>
      right.placements.reduce((sum, placement) => sum + placement.position.y + placement.size.length, 0) -
      left.placements.reduce((sum, placement) => sum + placement.position.y + placement.size.length, 0),
    (left, right) => left.containerIndex - right.containerIndex,
  );

  return sorted.map((containerInstance, normalizedIndex) => ({
    containerIndex: normalizedIndex,
    placements: sortPlacements(
      containerInstance.placements.map((placement) => ({
        ...placement,
        containerIndex: normalizedIndex,
      })),
    ),
  }));
};

const hasPlacementOverlap = (
  candidatePlacement: Placement,
  placedInContainer: readonly Placement[],
): boolean => {
  return placedInContainer.some((placedEntry) => {
    if (placedEntry.itemUnitId === candidatePlacement.itemUnitId) return false;
    return placementsOverlap(placedEntry, candidatePlacement);
  });
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

const compareResults = (left: PackingEngineOutput, right: PackingEngineOutput): number => {
  if (left.unplacedItemUnitIds.length !== right.unplacedItemUnitIds.length) {
    return left.unplacedItemUnitIds.length - right.unplacedItemUnitIds.length;
  }
  if (left.containers.length !== right.containers.length) {
    return left.containers.length - right.containers.length;
  }
  const leftPlacementCount = countPlacements(left.containers);
  const rightPlacementCount = countPlacements(right.containers);
  if (leftPlacementCount !== rightPlacementCount) {
    return rightPlacementCount - leftPlacementCount;
  }
  return 0;
};

const packWithLimit = (
  baseUnits: readonly OrderItemUnit[],
  containerLimit: number,
  container: ContainerType,
): PackingEngineOutput => {
  type ExistingPlacementCandidate = {
    unitIndex: number;
    layerIndex: number;
    placed: TryPlaceResult;
    area: number;
  };
  type NewLayerPlacementCandidate = {
    unitIndex: number;
    placed: TryPlaceResult;
    area: number;
  };

  const pickBestForExistingLayers = (
    remaining: readonly OrderItemUnit[],
    layers: readonly Layer[],
    containerIndex: number,
  ): ExistingPlacementCandidate | null => {
    let bestExisting: ExistingPlacementCandidate | null = null;
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
    return bestExisting;
  };

  const pickBestForNewLayer = (
    remaining: readonly OrderItemUnit[],
    newLayer: Layer,
    containerIndex: number,
  ): NewLayerPlacementCandidate | null => {
    let bestNewLayer: NewLayerPlacementCandidate | null = null;
    for (let unitIndex = 0; unitIndex < remaining.length; unitIndex += 1) {
      const unit = remaining[unitIndex];
      if (unit.dimensions.height > newLayer.height) continue;
      const placed = tryPlaceInLayer(newLayer, unit, containerIndex);
      if (!placed) continue;
      const area = placed.placement.size.width * placed.placement.size.length;
      if (!bestNewLayer || area > bestNewLayer.area) {
        bestNewLayer = { unitIndex, placed, area };
      }
    }
    return bestNewLayer;
  };

  const remaining = [...baseUnits];
  const containerInstances: ContainerInstance[] = [];

  let containerIndex = 0;
  while (remaining.length > 0 && containerIndex < containerLimit) {
    const layers: Layer[] = [];
    const placements: Placement[] = [];
    let placedInPass = true;

    while (placedInPass) {
      placedInPass = false;
      const bestExisting = pickBestForExistingLayers(remaining, layers, containerIndex);
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

      const nextLayerZ = layers.reduce((sum, layer) => sum + layer.height, 0);
      const availableHeight = container.height - nextLayerZ;
      const nextLayerHeight = pickNextLayerHeight(remaining, availableHeight);
      if (nextLayerHeight == null) break;

      const baseRects: FreeRect[] = getBaseRectsForLayer(nextLayerZ, layers, container);
      if (baseRects.length === 0) break;

      const newLayer: Layer = {
        z: nextLayerZ,
        height: nextLayerHeight,
        freeRects: sortFreeRects(baseRects),
        placements: [],
      };
      const bestNewLayer = pickBestForNewLayer(remaining, newLayer, containerIndex);
      if (!bestNewLayer) break;

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
      placements: sortPlacements(placements),
    });
    containerIndex += 1;
  }

  return {
    containers: normalizeContainerOrder(containerInstances),
    unplacedItemUnitIds: deterministicSort(
      remaining.map((unit) => unit.unitId),
      (left, right) => left.localeCompare(right),
    ),
  };
};

const packAcrossContainers = (
  baseUnits: readonly OrderItemUnit[],
  containerLimit: number,
  container: ContainerType,
  profile: PackingProfile = "balanced",
): PackingEngineOutput => {
  const isScoreBetter = (candidate: readonly number[], currentBest: readonly number[]): boolean => {
    const length = Math.min(candidate.length, currentBest.length);
    for (let index = 0; index < length; index += 1) {
      if (candidate[index] < currentBest[index]) return true;
      if (candidate[index] > currentBest[index]) return false;
    }
    return candidate.length < currentBest.length;
  };

  type ExistingLayerBest = {
    kind: "existing";
    containerIndex: number;
    layerIndex: number;
    placed: TryPlaceResult;
    score: number[];
  };
  type NewLayerBest = {
    kind: "new";
    containerIndex: number;
    newLayer: Layer;
    placed: TryPlaceResult;
    score: number[];
  };
  type BestPlacement = ExistingLayerBest | NewLayerBest;

  const buildScore = (
    state: ContainerState,
    placed: TryPlaceResult,
    itemTypeId: number,
    states: readonly ContainerState[],
    isNewLayer: boolean,
  ): number[] => {
    const firstContainerPlacements = states[0]?.placements.length ?? 0;
    const firstContainerSpillPenalty =
      state.containerIndex === 0 ? 0 : Math.max(0, firstContainerPlacements - state.placements.length);
    const farWallGap = container.length - (placed.placement.position.y + placed.placement.size.length);
    return [
      isNewLayer ? 1 : 0,
      firstContainerSpillPenalty,
      profile === "balanced" ? newTypeInContainerPenalty(state.placements, itemTypeId) : 0,
      yFrontGapPenalty(state.placements, placed.placement),
      containerEnvelopePenalty(state.placements, placed.placement),
      farWallGap,
      placed.wasteArea,
      placed.wasteWidth + placed.wasteLength,
      profile === "balanced" ? clusteringPenalty(state.placements, itemTypeId, placed.placement) : 0,
      placed.placement.position.z,
      -state.placements.length,
      state.containerIndex,
      -(placed.placement.position.y + placed.placement.size.length),
    ];
  };

  const canPlaceUnitInState = (state: ContainerState, unit: OrderItemUnit): boolean => {
    for (let layerIndex = 0; layerIndex < state.layers.length; layerIndex += 1) {
      const placed = tryPlaceInLayer(state.layers[layerIndex], unit, state.containerIndex);
      if (!placed) continue;
      if (!hasPlacementOverlap(placed.placement, state.placements)) return true;
    }

    const supportZLevels = getSupportZLevels(state.placements);
    for (const layerZ of supportZLevels) {
      if (state.layers.some((layer) => layer.z === layerZ)) continue;
      if (layerZ + unit.dimensions.height > container.height) continue;

      const baseRects: FreeRect[] = getBaseRectsForLayer(layerZ, state.layers, container);
      if (baseRects.length === 0) continue;

      const newLayer: Layer = {
        z: layerZ,
        height: normalizeLayerHeight(unit.dimensions.height, baseUnits, container.height - layerZ),
        freeRects: sortFreeRects(baseRects),
        placements: [],
      };
      const placedInNewLayer = tryPlaceInLayer(newLayer, unit, state.containerIndex);
      if (!placedInNewLayer) continue;
      if (!hasPlacementOverlap(placedInNewLayer.placement, state.placements)) return true;
    }
    return false;
  };

  const states: ContainerState[] = Array.from({ length: containerLimit }, (_, index) => ({
    containerIndex: index,
    layers: [],
    placements: [],
  }));
  const unplacedItemUnitIds: string[] = [];

  for (const unit of baseUnits) {
    const firstContainerOnly =
      containerLimit > 1 && states[0] != null && canPlaceUnitInState(states[0], unit);
    let best: BestPlacement | null = null;

    for (let stateIndex = 0; stateIndex < states.length; stateIndex += 1) {
      if (firstContainerOnly && stateIndex > 0) continue;
      const state = states[stateIndex];

      for (let layerIndex = 0; layerIndex < state.layers.length; layerIndex += 1) {
        const layer = state.layers[layerIndex];
        const placed = tryPlaceInLayer(layer, unit, state.containerIndex);
        if (!placed) continue;
        if (hasPlacementOverlap(placed.placement, state.placements)) continue;

        const score = buildScore(state, placed, unit.itemTypeId, states, false);
        if (!best || isScoreBetter(score, best.score)) {
          best = {
            kind: "existing",
            containerIndex: stateIndex,
            layerIndex,
            placed,
            score,
          };
        }
      }

      const supportZLevels = getSupportZLevels(state.placements);
      for (const layerZ of supportZLevels) {
        if (state.layers.some((layer) => layer.z === layerZ)) continue;
        if (layerZ + unit.dimensions.height > container.height) continue;

        const baseRects: FreeRect[] = getBaseRectsForLayer(layerZ, state.layers, container);
        if (baseRects.length === 0) continue;

        const newLayer: Layer = {
          z: layerZ,
          height: normalizeLayerHeight(unit.dimensions.height, baseUnits, container.height - layerZ),
          freeRects: sortFreeRects(baseRects),
          placements: [],
        };
        const placedInNewLayer = tryPlaceInLayer(newLayer, unit, state.containerIndex);
        if (!placedInNewLayer) continue;
        if (hasPlacementOverlap(placedInNewLayer.placement, state.placements)) continue;

        const newLayerScore = buildScore(state, placedInNewLayer, unit.itemTypeId, states, true);
        if (!best || isScoreBetter(newLayerScore, best.score)) {
          best = {
            kind: "new",
            containerIndex: stateIndex,
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
    if (best.kind === "new") {
      targetState.layers.push({
        ...best.newLayer,
        freeRects: best.placed.nextFreeRects,
        placements: [best.placed.placement],
      });
    } else {
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
      placements: sortPlacements(state.placements),
    }));

  return {
    containers: normalizeContainerOrder(containers),
    unplacedItemUnitIds: deterministicSort(unplacedItemUnitIds, (left, right) => left.localeCompare(right)),
  };
};

const pickBestResultByLimit = (
  baseUnits: readonly OrderItemUnit[],
  greedyResult: PackingEngineOutput,
  container: ContainerType,
): PackingEngineOutput => {
  if (greedyResult.unplacedItemUnitIds.length !== 0 || greedyResult.containers.length <= 1) {
    return greedyResult;
  }

  for (let limit = 1; limit < greedyResult.containers.length; limit += 1) {
    const candidatesForLimit = [
      packAcrossContainers(baseUnits, limit, container, "balanced"),
      packAcrossContainers(baseUnits, limit, container, "dense"),
      packWithLimit(baseUnits, limit, container),
    ];
    const fullyPlacedCandidates = candidatesForLimit.filter(
      (candidate) => candidate.unplacedItemUnitIds.length === 0,
    );
    if (fullyPlacedCandidates.length === 0) continue;
    return fullyPlacedCandidates.reduce((bestCandidate, currentCandidate) =>
      compareResults(currentCandidate, bestCandidate) < 0 ? currentCandidate : bestCandidate,
    );
  }

  return greedyResult;
};

export const runPackingEngine = (
  units: readonly OrderItemUnit[],
  container: ContainerType,
): PackingEngineOutput => {
  let bestResult: PackingEngineOutput | null = null;

  for (const sortStrategy of sortStrategies) {
    const baseUnits = sortStrategy(units);
    const greedyResult = packWithLimit(baseUnits, units.length, container);
    const strategyBest = pickBestResultByLimit(baseUnits, greedyResult, container);
    if (!bestResult || compareResults(strategyBest, bestResult) < 0) {
      bestResult = strategyBest;
    }
  }

  return bestResult ?? { containers: [], unplacedItemUnitIds: [] };
};
