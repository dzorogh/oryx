/**
 * Mixed-container packing: choose types + counts, stack same SKU, 2D-pack footprints.
 * Axis convention matches the existing engine: x = width (long side), y = length, z = height (mm).
 */

import { deterministicSort } from "@/lib/deterministic-sort";
import type { ContainerInstance, Dimensions, Placement, Position3D, RotationYaw } from "@/domain/packing/types";

export type MixedContainerType = {
  code: string;
  /** Long inner axis (mm) — engine `width` / x. */
  width: number;
  /** Short inner axis (mm) — engine `length` / y. */
  length: number;
  /** Inner height (mm) — engine `height` / z. */
  height: number;
  maxWeightKg: number;
};

export type MixedPackItem = {
  id: number;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightKg: number;
  quantity: number;
  quantityPerUnit: number;
  stacking: boolean;
  stackingLimit: number | null;
  rotateLength: boolean;
  rotateWidth: boolean;
  maxPerContainer: number | null;
};

export type MixedPackPlacement = Placement & {
  containerTypeCode: string;
};

export type MixedPackContainer = ContainerInstance & {
  typeCode: string;
  size: Dimensions;
  fillPercent: number;
  usedWeightKg: number;
};

export type MixedPackResult = {
  containers: MixedPackContainer[];
  oversizedItemIds: number[];
  unplacedBoxIds: string[];
  emptyVolumeMm3: number;
  totalContainerVolumeMm3: number;
  emptyVolumePercent: number;
};

type Orientation = {
  width: number;
  length: number;
  height: number;
  rotationYaw: RotationYaw;
};

type BoxUnit = {
  boxId: string;
  itemId: number;
  weightKg: number;
  orientations: Orientation[];
  stacking: boolean;
  stackingLimit: number | null;
  maxPerContainer: number | null;
};

type Stack = {
  stackId: string;
  itemId: number;
  boxIds: string[];
  footprint: { width: number; length: number };
  unitHeight: number;
  weightKg: number;
  rotationYaw: RotationYaw;
  unitSize: Dimensions;
  maxPerContainer: number | null;
};

type FreeRect = { x: number; y: number; width: number; length: number };

type OpenContainer = {
  type: MixedContainerType;
  freeRects: FreeRect[];
  placements: MixedPackPlacement[];
  usedWeightKg: number;
  pieceCountByItem: Map<number, number>;
};

export const containerTypeFromInnerMm = (args: {
  code: string;
  innerLengthMm: number;
  innerWidthMm: number;
  innerHeightMm: number;
  maxWeightKg: number;
}): MixedContainerType => ({
  code: args.code,
  width: args.innerLengthMm,
  length: args.innerWidthMm,
  height: args.innerHeightMm,
  maxWeightKg: args.maxWeightKg,
});

export const logisticsCmToMmItem = (
  item: Omit<MixedPackItem, "lengthMm" | "widthMm" | "heightMm"> & {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  },
): MixedPackItem => ({
  ...item,
  lengthMm: Math.round(item.lengthCm * 10),
  widthMm: Math.round(item.widthCm * 10),
  heightMm: Math.round(item.heightCm * 10),
});

const uniqueOrientations = (item: MixedPackItem): Orientation[] => {
  const w = item.widthMm;
  const l = item.lengthMm;
  const h = item.heightMm;
  const candidates: Orientation[] = [
    { width: w, length: l, height: h, rotationYaw: 0 },
    { width: l, length: w, height: h, rotationYaw: 90 },
  ];
  if (item.rotateLength) {
    candidates.push({ width: h, length: l, height: w, rotationYaw: 0 });
    candidates.push({ width: l, length: h, height: w, rotationYaw: 90 });
  }
  if (item.rotateWidth) {
    candidates.push({ width: w, length: h, height: l, rotationYaw: 0 });
    candidates.push({ width: h, length: w, height: l, rotationYaw: 90 });
  }
  const seen = new Set<string>();
  const result: Orientation[] = [];
  for (const c of candidates) {
    const key = `${c.width}x${c.length}x${c.height}:${c.rotationYaw}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }
  return result;
};

const expandBoxes = (items: readonly MixedPackItem[]): BoxUnit[] => {
  const boxes: BoxUnit[] = [];
  for (const item of items) {
    const perUnit = Math.max(1, Math.floor(item.quantityPerUnit) || 1);
    const boxCount = Math.ceil(Math.max(0, item.quantity) / perUnit);
    const orientations = uniqueOrientations(item);
    for (let i = 0; i < boxCount; i += 1) {
      boxes.push({
        boxId: `${item.id}-box-${String(i + 1).padStart(3, "0")}`,
        itemId: item.id,
        weightKg: item.weightKg * perUnit,
        orientations,
        stacking: item.stacking,
        stackingLimit: item.stackingLimit,
        maxPerContainer: item.maxPerContainer,
      });
    }
  }
  return boxes;
};

const fitsInContainer = (o: Orientation, container: MixedContainerType): boolean =>
  o.width <= container.width + 1e-6 &&
  o.length <= container.length + 1e-6 &&
  o.height <= container.height + 1e-6;

const floorGridCount = (o: Orientation, container: MixedContainerType): number =>
  Math.floor(container.width / o.width) * Math.floor(container.length / o.length);

const bestOrientationFor = (box: BoxUnit, container: MixedContainerType): Orientation | null => {
  if (box.weightKg > container.maxWeightKg + 1e-6) return null;
  const fitting = box.orientations.filter((o) => fitsInContainer(o, container));
  if (!fitting.length) return null;
  const capacity = (o: Orientation) =>
    Math.min(
      floorGridCount(o, container) * maxTiers(box, container, o.height),
      box.maxPerContainer ?? Number.POSITIVE_INFINITY,
    );
  return deterministicSort(
    fitting,
    (a, b) => capacity(b) - capacity(a),
    (a, b) => a.height - b.height,
    (a, b) => a.width - b.width,
  )[0];
};

function maxTiers(box: BoxUnit, container: MixedContainerType, unitHeight: number): number {
  if (!box.stacking) return 1;
  const byHeight = Math.max(1, Math.floor(container.height / unitHeight));
  const byLimit =
    box.stackingLimit != null && box.stackingLimit > 0 ? box.stackingLimit : byHeight;
  const byWeight =
    box.weightKg > 0 ? Math.floor(container.maxWeightKg / box.weightKg) : Number.POSITIVE_INFINITY;
  return Math.max(1, Math.min(byHeight, byLimit, byWeight));
}

const volumeOf = (type: MixedContainerType): number => type.width * type.length * type.height;

const splitFreeRect = (rect: FreeRect, placed: { width: number; length: number }): FreeRect[] => {
  const result: FreeRect[] = [];
  const right = rect.width - placed.width;
  const front = rect.length - placed.length;
  if (right > 0) {
    result.push({ x: rect.x + placed.width, y: rect.y, width: right, length: placed.length });
  }
  if (front > 0) {
    result.push({ x: rect.x, y: rect.y + placed.length, width: rect.width, length: front });
  }
  return result;
};

const buildStacksForType = (boxes: BoxUnit[], container: MixedContainerType): Stack[] => {
  const byItem = new Map<number, BoxUnit[]>();
  for (const box of boxes) {
    if (!bestOrientationFor(box, container)) continue;
    const list = byItem.get(box.itemId) ?? [];
    list.push(box);
    byItem.set(box.itemId, list);
  }

  const stacks: Stack[] = [];
  for (const [itemId, group] of deterministicSort([...byItem.entries()], (a, b) => a[0] - b[0])) {
    const sample = group[0];
    const orient = bestOrientationFor(sample, container);
    if (!orient) continue;
    const tiers = Math.max(
      1,
      Math.min(maxTiers(sample, container, orient.height), sample.maxPerContainer ?? Number.POSITIVE_INFINITY),
    );
    let remaining = [...group];
    let stackIndex = 0;
    while (remaining.length) {
      const take = remaining.splice(0, tiers);
      stacks.push({
        stackId: `${itemId}-stack-${String(++stackIndex).padStart(3, "0")}`,
        itemId,
        boxIds: take.map((b) => b.boxId),
        footprint: { width: orient.width, length: orient.length },
        unitHeight: orient.height,
        weightKg: take.reduce((sum, b) => sum + b.weightKg, 0),
        rotationYaw: orient.rotationYaw,
        unitSize: { width: orient.width, length: orient.length, height: orient.height },
        maxPerContainer: sample.maxPerContainer,
      });
    }
  }

  return deterministicSort(
    stacks,
    (a, b) => b.footprint.width * b.footprint.length - a.footprint.width * a.footprint.length,
    (a, b) => b.unitHeight * b.boxIds.length - a.unitHeight * a.boxIds.length,
    (a, b) => a.itemId - b.itemId,
    (a, b) => a.stackId.localeCompare(b.stackId),
  );
};

const tryPlaceStack = (open: OpenContainer, stack: Stack): boolean => {
  if (open.usedWeightKg + stack.weightKg > open.type.maxWeightKg + 1e-6) return false;
  if (stack.unitHeight * stack.boxIds.length > open.type.height + 1e-6) return false;
  if (
    stack.footprint.width > open.type.width + 1e-6 ||
    stack.footprint.length > open.type.length + 1e-6
  ) {
    return false;
  }
  const current = open.pieceCountByItem.get(stack.itemId) ?? 0;
  if (stack.maxPerContainer != null && current + stack.boxIds.length > stack.maxPerContainer) {
    return false;
  }

  const candidates = open.freeRects
    .map((rect, index) => ({ rect, index }))
    .filter(
      ({ rect }) =>
        stack.footprint.width <= rect.width + 1e-6 && stack.footprint.length <= rect.length + 1e-6,
    );
  if (!candidates.length) return false;

  const best = deterministicSort(
    candidates,
    (a, b) =>
      a.rect.width * a.rect.length -
      stack.footprint.width * stack.footprint.length -
      (b.rect.width * b.rect.length - stack.footprint.width * stack.footprint.length),
    (a, b) => a.rect.y - b.rect.y,
    (a, b) => a.rect.x - b.rect.x,
  )[0];

  const rect = best.rect;
  const position: Position3D = { x: rect.x, y: rect.y, z: 0 };
  for (let tier = 0; tier < stack.boxIds.length; tier += 1) {
    open.placements.push({
      containerIndex: -1,
      itemUnitId: stack.boxIds[tier],
      itemTypeId: stack.itemId,
      position: { x: position.x, y: position.y, z: tier * stack.unitSize.height },
      rotationYaw: stack.rotationYaw,
      size: { ...stack.unitSize },
      containerTypeCode: open.type.code,
    });
  }

  open.freeRects = deterministicSort(
    [
      ...open.freeRects.slice(0, best.index),
      ...open.freeRects.slice(best.index + 1),
      ...splitFreeRect(rect, stack.footprint),
    ].filter((r) => r.width > 1 && r.length > 1),
    (a, b) => a.y - b.y,
    (a, b) => a.x - b.x,
  );
  open.usedWeightKg += stack.weightKg;
  open.pieceCountByItem.set(stack.itemId, current + stack.boxIds.length);
  return true;
};

const newOpen = (type: MixedContainerType): OpenContainer => ({
  type,
  freeRects: [{ x: 0, y: 0, width: type.width, length: type.length }],
  placements: [],
  usedWeightKg: 0,
  pieceCountByItem: new Map(),
});

const fillOne = (
  remaining: BoxUnit[],
  type: MixedContainerType,
): { open: OpenContainer; rest: BoxUnit[]; filled: number } => {
  const open = newOpen(type);
  const usedBoxIds = new Set<string>();
  for (const stack of buildStacksForType(remaining, type)) {
    if (tryPlaceStack(open, stack)) {
      for (const id of stack.boxIds) usedBoxIds.add(id);
    }
  }
  const filled = open.placements.reduce(
    (sum, p) => sum + p.size.width * p.size.length * p.size.height,
    0,
  );
  return { open, rest: remaining.filter((b) => !usedBoxIds.has(b.boxId)), filled };
};

/**
 * Greedy: each step, if one container can take everything left, use the smallest such type;
 * otherwise fill `primary` (or, without a primary, the type that takes the most volume).
 */
const greedyPack = (
  boxes: BoxUnit[],
  types: MixedContainerType[],
  maxContainers: number,
  primary: MixedContainerType | null = null,
): { opens: OpenContainer[]; unplaced: BoxUnit[] } => {
  const largestFirst = deterministicSort(
    types,
    (a, b) => volumeOf(b) - volumeOf(a),
    (a, b) => a.code.localeCompare(b.code),
  );
  const smallestFirst = [...largestFirst].reverse();
  let remaining = [...boxes];
  const opens: OpenContainer[] = [];

  while (remaining.length && opens.length < maxContainers) {
    let chosen: { open: OpenContainer; rest: BoxUnit[] } | null = null;

    for (const type of smallestFirst) {
      const attempt = fillOne(remaining, type);
      if (!attempt.rest.length) {
        chosen = attempt;
        break;
      }
    }

    if (!chosen) {
      const candidates = primary ? [primary] : largestFirst;
      let bestFilled = -1;
      for (const type of candidates) {
        const attempt = fillOne(remaining, type);
        if (attempt.open.placements.length && attempt.filled > bestFilled) {
          bestFilled = attempt.filled;
          chosen = attempt;
        }
      }
    }

    if (!chosen || !chosen.open.placements.length) break;
    opens.push(chosen.open);
    remaining = chosen.rest;
  }

  return { opens, unplaced: remaining };
};

const scoreOpens = (opens: OpenContainer[]) => {
  let filled = 0;
  let total = 0;
  for (const open of opens) {
    total += volumeOf(open.type);
    for (const p of open.placements) {
      filled += p.size.width * p.size.length * p.size.height;
    }
  }
  const emptyVolume = Math.max(0, total - filled);
  return {
    emptyVolume,
    totalVolume: total,
    emptyPercent: total > 0 ? (emptyVolume / total) * 100 : 0,
    containerCount: opens.length,
  };
};

/**
 * `n` containers of one type. "retry" — needs more containers;
 * "impossible" — some boxes never fit this type.
 */
const packHomogeneousFleet = (
  boxes: BoxUnit[],
  type: MixedContainerType,
  n: number,
): OpenContainer[] | "retry" | "impossible" => {
  const opens = Array.from({ length: n }, () => newOpen(type));
  const used = new Set<string>();
  for (const stack of buildStacksForType(boxes, type)) {
    const target = opens.find((open) => tryPlaceStack(open, stack));
    if (!target) return "retry";
    for (const id of stack.boxIds) used.add(id);
  }
  if (boxes.some((b) => !used.has(b.boxId))) return "impossible";
  return opens.filter((open) => open.placements.length > 0);
};

/** Try homogeneous fleets of each type with N = 1..max, then greedy mixed. */
const searchFleets = (
  boxes: BoxUnit[],
  types: MixedContainerType[],
  maxContainers: number,
): { opens: OpenContainer[]; unplaced: BoxUnit[] } => {
  type Cand = { opens: OpenContainer[]; unplaced: BoxUnit[]; emptyVolume: number; containerCount: number };
  const state: { best: Cand | null } = { best: null };

  const consider = (opens: OpenContainer[], unplaced: BoxUnit[]) => {
    if (unplaced.length) return;
    if (!opens.length) return;
    const score = scoreOpens(opens);
    const cand: Cand = {
      opens,
      unplaced,
      emptyVolume: score.emptyVolume,
      containerCount: score.containerCount,
    };
    const best = state.best;
    // Fewer containers always win; among equal counts — less empty volume.
    if (
      !best ||
      cand.containerCount < best.containerCount ||
      (cand.containerCount === best.containerCount && cand.emptyVolume + 1e-6 < best.emptyVolume)
    ) {
      state.best = cand;
    }
  };

  for (const type of types) {
    // Stops at the first feasible count: more containers of one type only add empty volume.
    for (let n = 1; n <= maxContainers; n += 1) {
      const fleet = packHomogeneousFleet(boxes, type, n);
      if (fleet === "retry") continue;
      if (fleet !== "impossible") consider(fleet, []);
      break;
    }
  }

  for (const primary of [null, ...types]) {
    const greedy = greedyPack(boxes, types, maxContainers, primary);
    if (!greedy.unplaced.length) {
      consider(greedy.opens, []);
    }
  }

  const chosen = state.best as Cand | null;
  if (chosen) return { opens: chosen.opens, unplaced: [] };
  return greedyPack(boxes, types, maxContainers);
};

const finalizeOpens = (opens: OpenContainer[]): MixedPackContainer[] =>
  opens.map((open, index) => {
    const size: Dimensions = {
      width: open.type.width,
      length: open.type.length,
      height: open.type.height,
    };
    const vol = volumeOf(open.type);
    const filled = open.placements.reduce(
      (sum, p) => sum + p.size.width * p.size.length * p.size.height,
      0,
    );
    return {
      containerIndex: index,
      typeCode: open.type.code,
      size,
      fillPercent: vol > 0 ? (filled / vol) * 100 : 0,
      usedWeightKg: open.usedWeightKg,
      placements: open.placements.map((p) => ({ ...p, containerIndex: index })),
    };
  });

export const packMixedContainers = (
  items: readonly MixedPackItem[],
  allowedTypes: readonly MixedContainerType[],
): MixedPackResult => {
  if (!allowedTypes.length) {
    return {
      containers: [],
      oversizedItemIds: [...new Set(items.map((i) => i.id))],
      unplacedBoxIds: [],
      emptyVolumeMm3: 0,
      totalContainerVolumeMm3: 0,
      emptyVolumePercent: 0,
    };
  }

  const boxes = expandBoxes(items);
  const oversizedItemIds = new Set<number>();
  const packable: BoxUnit[] = [];

  for (const box of boxes) {
    if (allowedTypes.some((type) => bestOrientationFor(box, type))) {
      packable.push(box);
    } else {
      oversizedItemIds.add(box.itemId);
    }
  }

  if (!packable.length) {
    return {
      containers: [],
      oversizedItemIds: [...oversizedItemIds],
      unplacedBoxIds: boxes.map((b) => b.boxId),
      emptyVolumeMm3: 0,
      totalContainerVolumeMm3: 0,
      emptyVolumePercent: 0,
    };
  }

  const maxContainers = Math.min(40, Math.max(1, packable.length));
  const { opens, unplaced } = searchFleets(packable, [...allowedTypes], maxContainers);
  const score = scoreOpens(opens);

  return {
    containers: finalizeOpens(opens),
    oversizedItemIds: [...oversizedItemIds],
    unplacedBoxIds: unplaced.map((b) => b.boxId),
    emptyVolumeMm3: score.emptyVolume,
    totalContainerVolumeMm3: score.totalVolume,
    emptyVolumePercent: score.emptyPercent,
  };
};
