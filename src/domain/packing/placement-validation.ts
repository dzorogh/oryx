import type { ContainerType, Placement } from "./types";
import { HEIGHT_TOLERANCE_MM } from "./tolerances";

const boxesOverlap1D = (
  leftStart: number,
  leftSize: number,
  rightStart: number,
  rightSize: number,
): boolean => {
  const leftEnd = leftStart + leftSize;
  const rightEnd = rightStart + rightSize;
  return leftStart < rightEnd && rightStart < leftEnd;
};

export const placementsOverlap = (left: Placement, right: Placement): boolean => {
  return (
    boxesOverlap1D(left.position.x, left.size.width, right.position.x, right.size.width) &&
    boxesOverlap1D(left.position.y, left.size.length, right.position.y, right.size.length) &&
    boxesOverlap1D(left.position.z, left.size.height, right.position.z, right.size.height)
  );
};

export const isPlacementInBounds = (
  placement: Placement,
  container: ContainerType,
): boolean => {
  if (
    placement.position.x < 0 ||
    placement.position.y < 0 ||
    placement.position.z < 0
  ) {
    return false;
  }

  const maxX = placement.position.x + placement.size.width;
  const maxY = placement.position.y + placement.size.length;
  const maxZ = placement.position.z + placement.size.height;

  return (
    maxX <= container.width && maxY <= container.length && maxZ <= container.height
  );
};

const overlapArea2D = (base: Placement, support: Placement): number => {
  const left = Math.max(base.position.x, support.position.x);
  const right = Math.min(
    base.position.x + base.size.width,
    support.position.x + support.size.width,
  );
  const near = Math.max(base.position.y, support.position.y);
  const far = Math.min(
    base.position.y + base.size.length,
    support.position.y + support.size.length,
  );

  if (right <= left || far <= near) {
    return 0;
  }

  return (right - left) * (far - near);
};

export const hasSupport = (
  placement: Placement,
  placementsInContainer: readonly Placement[],
): boolean => {
  if (placement.position.z === 0) {
    return true;
  }

  const supports = placementsInContainer.filter((candidate) => {
    if (candidate.itemUnitId === placement.itemUnitId) {
      return false;
    }

    const candidateTopZ = candidate.position.z + candidate.size.height;
    return (
      candidateTopZ <= placement.position.z &&
      placement.position.z - candidateTopZ <= HEIGHT_TOLERANCE_MM
    );
  });

  const supportedArea = supports.reduce((area, candidate) => {
    return area + overlapArea2D(placement, candidate);
  }, 0);

  return supportedArea > 0;
};

export const validateContainerPlacements = (
  placements: readonly Placement[],
  container: ContainerType,
): string[] => {
  const violations: string[] = [];

  for (const placement of placements) {
    if (!isPlacementInBounds(placement, container)) {
      violations.push(`Out of bounds: ${placement.itemUnitId}`);
    }
  }

  for (let index = 0; index < placements.length; index += 1) {
    for (let next = index + 1; next < placements.length; next += 1) {
      if (placementsOverlap(placements[index], placements[next])) {
        violations.push(
          `Overlap: ${placements[index].itemUnitId} & ${placements[next].itemUnitId}`,
        );
      }
    }
  }

  for (const placement of placements) {
    if (!hasSupport(placement, placements)) {
      violations.push(`Unsupported placement: ${placement.itemUnitId}`);
    }
  }

  return violations;
};
