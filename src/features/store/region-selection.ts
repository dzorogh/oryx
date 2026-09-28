/**
 * Validated shared region code. While regions are loading the stored code is trusted,
 * afterwards a code that is not in the active list counts as «не выбран».
 */
export const resolveSelectedRegionCode = (
  storedCode: string | null,
  validCodes: ReadonlySet<string>,
  regionsLoading: boolean,
): string | null => {
  if (!storedCode) return null;
  if (regionsLoading) return storedCode;
  return validCodes.has(storedCode) ? storedCode : null;
};
