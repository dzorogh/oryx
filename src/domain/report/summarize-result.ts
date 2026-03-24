import type {
  ContainerInstance,
  ContainerType,
  PackingPostCheck,
  PackingResult,
  PackingSummary,
} from "../packing/types";

export const NON_LAST_CONTAINER_EMPTY_VOLUME_THRESHOLD_PERCENT = 30;

const getContainerVolume = (containerType: ContainerType): number =>
  containerType.width * containerType.length * containerType.height;

const getOccupiedVolume = (container: ContainerInstance): number =>
  container.placements.reduce(
    (sum, placement) => sum + placement.size.width * placement.size.length * placement.size.height,
    0,
  );

export const buildPostCheck = (
  containers: readonly ContainerInstance[],
  containerType: ContainerType,
): PackingPostCheck => {
  const checkedContainers = containers.slice(0, -1);
  const containerVolume = getContainerVolume(containerType);
  if (checkedContainers.length === 0 || containerVolume <= 0) {
    return {
      nonLastContainerEmptyVolume: {
        thresholdPercent: NON_LAST_CONTAINER_EMPTY_VOLUME_THRESHOLD_PERCENT,
        checkedContainerCount: 0,
        maxEmptyVolumePercent: 0,
        failingContainerIndex: null,
        pass: true,
      },
    };
  }

  let maxEmptyVolumePercent = 0;
  let failingContainerIndex: number | null = null;
  for (const container of checkedContainers) {
    const occupiedVolume = getOccupiedVolume(container);
    const emptyVolumePercent = ((containerVolume - occupiedVolume) / containerVolume) * 100;
    if (emptyVolumePercent > maxEmptyVolumePercent) {
      maxEmptyVolumePercent = emptyVolumePercent;
    }
    if (
      failingContainerIndex === null &&
      emptyVolumePercent > NON_LAST_CONTAINER_EMPTY_VOLUME_THRESHOLD_PERCENT
    ) {
      failingContainerIndex = container.containerIndex;
    }
  }

  return {
    nonLastContainerEmptyVolume: {
      thresholdPercent: NON_LAST_CONTAINER_EMPTY_VOLUME_THRESHOLD_PERCENT,
      checkedContainerCount: checkedContainers.length,
      maxEmptyVolumePercent,
      failingContainerIndex,
      pass: failingContainerIndex === null,
    },
  };
};

export const summarizeResult = (input: {
  totalUnits: number;
  unplacedItemUnitIds: readonly string[];
}): PackingSummary => {
  const unplacedUnits = input.unplacedItemUnitIds.length;
  const placedUnits = input.totalUnits - unplacedUnits;

  return {
    totalUnits: input.totalUnits,
    placedUnits,
    unplacedUnits,
  };
};

export const withSummary = (
  partialResult: Omit<PackingResult, "summary">,
  totalUnits: number,
): PackingResult => {
  return {
    ...partialResult,
    summary: summarizeResult({
      totalUnits,
      unplacedItemUnitIds: partialResult.unplacedItemUnitIds,
    }),
  };
};
