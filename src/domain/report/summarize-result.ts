import type { PackingResult, PackingSummary } from "../packing/types";

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
