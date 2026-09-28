type SelectableVariant = { id: string; deletedAt: string | null };

/** Variant from `?variant=`, else the first active one, else the first archived one. */
export const resolveSelectedVariant = <T extends SelectableVariant>(
  variants: readonly T[],
  requestedId: string | null,
): T | null =>
  variants.find((variant) => variant.id === requestedId) ??
  variants.find((variant) => !variant.deletedAt) ??
  variants[0] ??
  null;
