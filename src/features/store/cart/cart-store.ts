/** Pure cart storage helpers: localStorage `store-cart` = [{variantId, quantity}]. */

export const STORE_CART_STORAGE_KEY = "store-cart";

export type CartLine = {
  variantId: string;
  quantity: number;
};

export const parseCartLines = (raw: unknown): CartLine[] => {
  if (!Array.isArray(raw)) return [];
  const lines: CartLine[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const variantId = String((entry as { variantId?: unknown }).variantId ?? "").trim();
    const quantity = Number((entry as { quantity?: unknown }).quantity);
    if (!/^\d+$/.test(variantId) || !Number.isFinite(quantity)) continue;
    if (seen.has(variantId)) continue;
    seen.add(variantId);
    const whole = Math.floor(quantity);
    if (whole <= 0) continue;
    lines.push({ variantId, quantity: whole });
  }
  return lines;
};

export const serializeCartLines = (lines: readonly CartLine[]): string =>
  JSON.stringify(
    lines
      .filter((line) => line.quantity > 0)
      .map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
  );

/**
 * Parsed quantity from the text field.
 * Empty input returns null — the caller restores the previous quantity.
 */
export const quantityFromDraft = (raw: string, quantityPerUnit: number): number | null => {
  if (raw.trim() === "") return null;
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return normalizeCartQuantity(parsed, quantityPerUnit);
};

/** Round quantity up to a multiple of `quantityPerUnit`. ≤0 → 0 (caller removes the line). */
export const normalizeCartQuantity = (raw: number, quantityPerUnit: number): number => {
  const step = Math.max(1, Math.floor(quantityPerUnit) || 1);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.ceil(raw / step) * step;
};

export const upsertCartLine = (
  lines: readonly CartLine[],
  variantId: string,
  quantity: number,
  quantityPerUnit: number,
): CartLine[] => {
  const nextQty = normalizeCartQuantity(quantity, quantityPerUnit);
  if (nextQty <= 0) return lines.filter((line) => line.variantId !== variantId);
  if (!lines.some((line) => line.variantId === variantId)) {
    return [...lines, { variantId, quantity: nextQty }];
  }
  return lines.map((line) => (line.variantId === variantId ? { variantId, quantity: nextQty } : line));
};

export const addCartPack = (
  lines: readonly CartLine[],
  variantId: string,
  quantityPerUnit: number,
): CartLine[] => {
  const step = Math.max(1, Math.floor(quantityPerUnit) || 1);
  const existing = lines.find((line) => line.variantId === variantId);
  const current = existing?.quantity ?? 0;
  return upsertCartLine(lines, variantId, current + step, step);
};

export const adjustCartPack = (
  lines: readonly CartLine[],
  variantId: string,
  deltaPacks: number,
  quantityPerUnit: number,
): CartLine[] => {
  const step = Math.max(1, Math.floor(quantityPerUnit) || 1);
  const existing = lines.find((line) => line.variantId === variantId);
  const current = existing?.quantity ?? 0;
  return upsertCartLine(lines, variantId, current + deltaPacks * step, step);
};

/** Rounds every line up to its pack size; returns the same array when nothing changes. */
export const normalizeCartToPacks = (
  lines: CartLine[],
  quantityPerUnitOf: (variantId: string) => number | undefined,
): CartLine[] => {
  let changed = false;
  const next = lines.map((line) => {
    const step = quantityPerUnitOf(line.variantId);
    if (!step || step <= 1) return line;
    const quantity = normalizeCartQuantity(line.quantity, step);
    if (quantity === line.quantity) return line;
    changed = true;
    return { variantId: line.variantId, quantity };
  });
  return changed ? next : lines;
};

export const removeCartLine = (lines: readonly CartLine[], variantId: string): CartLine[] =>
  lines.filter((line) => line.variantId !== variantId);

export const removeCartLines = (lines: readonly CartLine[], variantIds: readonly string[]): CartLine[] => {
  const drop = new Set(variantIds);
  return lines.filter((line) => !drop.has(line.variantId));
};

/** Drop the submitted quantity. A line added in another tab while the request was in flight stays. */
export const subtractCartQuantities = (
  lines: readonly CartLine[],
  submitted: readonly { variantId: string; quantity: number }[],
): CartLine[] => {
  const taken = new Map<string, number>();
  for (const row of submitted) {
    if (!Number.isFinite(row.quantity) || row.quantity <= 0) continue;
    taken.set(row.variantId, (taken.get(row.variantId) ?? 0) + row.quantity);
  }
  const next: CartLine[] = [];
  for (const line of lines) {
    const quantity = line.quantity - (taken.get(line.variantId) ?? 0);
    if (quantity > 0) next.push({ variantId: line.variantId, quantity });
  }
  return next;
};

export type CatalogTrackState = {
  /** Ids whose catalog request finished (success or failure). Not cleared when lines leave the cart. */
  requested: ReadonlySet<string>;
  failed: ReadonlySet<string>;
};

export const noteCatalogSuccess = (state: CatalogTrackState, ids: readonly string[]): CatalogTrackState => {
  const requested = new Set(state.requested);
  const failed = new Set(state.failed);
  for (const id of ids) {
    requested.add(id);
    failed.delete(id);
  }
  return { requested, failed };
};

export const noteCatalogFailure = (state: CatalogTrackState, ids: readonly string[]): CatalogTrackState => {
  const requested = new Set(state.requested);
  const failed = new Set(state.failed);
  for (const id of ids) {
    requested.add(id);
    failed.add(id);
  }
  return { requested, failed };
};

/** Drop failed ids from `requested` so the next load asks for them again. */
export const retryCatalogState = (state: CatalogTrackState): CatalogTrackState => {
  const requested = new Set(state.requested);
  for (const id of state.failed) requested.delete(id);
  return { requested, failed: new Set() };
};

export const catalogFailedVariantIds = (lineIds: readonly string[], failed: ReadonlySet<string>): string[] =>
  lineIds.filter((id) => failed.has(id));

/** Requested, not failed, and absent from the catalog response — deleted or archived. */
export const missingCatalogVariantIds = (
  lineIds: readonly string[],
  requested: ReadonlySet<string>,
  failed: ReadonlySet<string>,
  loadedIds: ReadonlySet<string>,
): string[] => lineIds.filter((id) => requested.has(id) && !failed.has(id) && !loadedIds.has(id));

export const cartTotalUnits = (lines: readonly CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.quantity, 0);

export const cartLineCount = (lines: readonly CartLine[]): number => lines.length;

const EMPTY_CART: CartLine[] = [];
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY_CART;

/** Stable snapshot for `useSyncExternalStore`: same array while the stored string is unchanged. */
export const readCartFromStorage = (): CartLine[] => {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORE_CART_STORAGE_KEY);
  } catch {
    return EMPTY_CART;
  }
  if (raw === cachedRaw) return cachedLines;
  cachedRaw = raw;
  try {
    cachedLines = raw ? parseCartLines(JSON.parse(raw) as unknown) : EMPTY_CART;
  } catch {
    cachedLines = EMPTY_CART;
  }
  return cachedLines;
};

export const writeCartToStorage = (lines: readonly CartLine[]): void => {
  try {
    window.localStorage.setItem(STORE_CART_STORAGE_KEY, serializeCartLines(lines));
  } catch {
    // ignore quota / private mode
  }
};
