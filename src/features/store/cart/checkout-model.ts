/** Pure checkout layout: hub/plant blocks, prices with Supply costs, currency totals. */

import { formatEntityCode } from "@/lib/entity-codes";
import { convert, type OrderRates } from "@/features/logistics/order-money";
import type { CurrencyCode } from "@/features/store/domain/currency";
import type { DealerStatus } from "@/features/store/domain/statuses";

export type CheckoutFulfillmentMode = "hub" | "plant";

export type CheckoutCartItem = {
  variantId: string;
  name: string;
  imageUrl: string | null;
  plantId: string | null;
  plantCode: string | null;
  quantity: number;
  quantityPerUnit: number;
  dealerPrice: number | null;
  dealerCurrency: CurrencyCode | null;
  dealerStatus: DealerStatus;
  supplyCostPercent: number | null;
  /** Hub ready quantity for selected region (null when unknown / no hub). */
  hubReady: number | null;
};

export type CheckoutLinePricing = {
  unitPrice: number;
  currency: CurrencyCode;
  supplyCostPercent: number;
  supplyCostAmount: number;
  lineTotal: number;
  fromStock: number | null;
  onOrder: number | null;
};

export type CheckoutBlockLine = {
  variantId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  included: boolean;
  blockReason: string | null;
  pricing: CheckoutLinePricing | null;
  plantCode: string | null;
  hubReady: number | null;
};

export type CheckoutBlock = {
  id: string;
  mode: CheckoutFulfillmentMode;
  /** Hub warehouse id or plant id. */
  sourceId: string;
  sourceCode: string;
  lines: CheckoutBlockLine[];
  /** Supply costs per currency; empty for plant blocks and when every line has 0%. */
  supplyCostTotals: Array<{ currency: CurrencyCode; total: number }>;
  currencyTotals: Array<{ currency: CurrencyCode; total: number }>;
};

export type CheckoutRemainderLine = {
  variantId: string;
  name: string;
  quantity: number;
  reason: string;
  /** Unchecked by the user — can be returned to the order. */
  excluded?: boolean;
};

export type CheckoutLayout = {
  mode: CheckoutFulfillmentMode;
  blocks: CheckoutBlock[];
  remainder: CheckoutRemainderLine[];
  hubAvailable: boolean;
  hubUnavailableReason: string | null;
};

/** Prices are kept to kopecks/cents: the line price goes to the order as is. */
export const roundMoney = (amount: number): number => Math.round(amount * 100) / 100;

export const applySupplyCost = (
  dealerPrice: number,
  supplyCostPercent: number | null | undefined,
): { unitPrice: number; percent: number; supplyAmount: number } => {
  const percent = supplyCostPercent == null || !Number.isFinite(supplyCostPercent) ? 0 : supplyCostPercent;
  const supplyAmount = roundMoney(dealerPrice * (percent / 100));
  return { unitPrice: roundMoney(dealerPrice + supplyAmount), percent, supplyAmount };
};

export const splitHubAvailability = (
  quantity: number,
  hubReady: number | null,
): { fromStock: number | null; onOrder: number | null } => {
  if (hubReady == null || !Number.isFinite(hubReady)) {
    return { fromStock: null, onOrder: null };
  }
  const ready = Math.max(0, hubReady);
  const fromStock = Math.min(quantity, ready);
  const onOrder = Math.max(0, quantity - fromStock);
  return { fromStock, onOrder };
};

export const lineBlockReason = (
  item: Pick<CheckoutCartItem, "dealerPrice" | "dealerStatus">,
  hasRegion: boolean,
): string | null => {
  if (!hasRegion) return "Выберите регион";
  if (item.dealerStatus === "unavailable") {
    return "Товар временно недоступен для заказа.";
  }
  if (item.dealerPrice === null) {
    return "Для товара не задана дилерская цена.";
  }
  return null;
};

const currencyTotalsFromLines = (
  lines: CheckoutBlockLine[],
): Array<{ currency: CurrencyCode; total: number }> => {
  const map = new Map<CurrencyCode, number>();
  for (const line of lines) {
    if (!line.included || !line.pricing) continue;
    map.set(line.pricing.currency, (map.get(line.pricing.currency) ?? 0) + line.pricing.lineTotal);
  }
  return [...map.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
};

export const buildCheckoutLayout = (args: {
  mode: CheckoutFulfillmentMode;
  items: readonly CheckoutCartItem[];
  includedVariantIds: ReadonlySet<string>;
  hasRegion: boolean;
  hubWarehouseId: string | null;
  hubCode: string | null;
}): CheckoutLayout => {
  const { mode, items, includedVariantIds, hasRegion, hubWarehouseId, hubCode } = args;

  if (mode === "hub") {
    if (!hubWarehouseId || !hubCode) {
      return {
        mode,
        blocks: [],
        remainder: items.map((item) => ({
          variantId: item.variantId,
          name: item.name,
          quantity: item.quantity,
          reason: "У региона не задан хаб",
        })),
        hubAvailable: false,
        hubUnavailableReason: "У региона не задан хаб — способ «Склад региона» недоступен",
      };
    }

    const lines: CheckoutBlockLine[] = [];
    const remainder: CheckoutRemainderLine[] = [];

    for (const item of items) {
      const blockReason = lineBlockReason(item, hasRegion);
      const included = includedVariantIds.has(item.variantId) && blockReason == null;
      if (!includedVariantIds.has(item.variantId)) {
        remainder.push({
          variantId: item.variantId,
          name: item.name,
          quantity: item.quantity,
          reason: "Снято с заказа",
          excluded: true,
        });
        continue;
      }
      if (blockReason) {
        remainder.push({
          variantId: item.variantId,
          name: item.name,
          quantity: item.quantity,
          reason: blockReason,
        });
        continue;
      }

      const dealerPrice = item.dealerPrice as number;
      const currency = item.dealerCurrency as CurrencyCode;
      const priced = applySupplyCost(dealerPrice, item.supplyCostPercent);
      const split = splitHubAvailability(item.quantity, item.hubReady);
      lines.push({
        variantId: item.variantId,
        name: item.name,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        included: true,
        blockReason: null,
        plantCode: item.plantCode,
        hubReady: item.hubReady,
        pricing: {
          unitPrice: priced.unitPrice,
          currency,
          supplyCostPercent: priced.percent,
          supplyCostAmount: priced.supplyAmount,
          lineTotal: priced.unitPrice * item.quantity,
          fromStock: split.fromStock,
          onOrder: split.onOrder,
        },
      });
    }

    const supplyByCurrency = new Map<CurrencyCode, number>();
    for (const line of lines) {
      if (!line.pricing || line.pricing.supplyCostAmount <= 0) continue;
      const { currency, supplyCostAmount } = line.pricing;
      supplyByCurrency.set(currency, (supplyByCurrency.get(currency) ?? 0) + supplyCostAmount * line.quantity);
    }
    const supplyCostTotals = [...supplyByCurrency.entries()]
      .map(([currency, total]) => ({ currency, total }))
      .sort((a, b) => a.currency.localeCompare(b.currency));

    return {
      mode,
      hubAvailable: true,
      hubUnavailableReason: null,
      remainder,
      blocks: [
        {
          id: `hub:${hubWarehouseId}`,
          mode: "hub",
          sourceId: hubWarehouseId,
          sourceCode: hubCode,
          lines,
          supplyCostTotals,
          currencyTotals: currencyTotalsFromLines(lines),
        },
      ],
    };
  }

  // plant mode
  const remainder: CheckoutRemainderLine[] = [];
  const byPlant = new Map<string, CheckoutCartItem[]>();

  for (const item of items) {
    if (!includedVariantIds.has(item.variantId)) {
      remainder.push({
        variantId: item.variantId,
        name: item.name,
        quantity: item.quantity,
        reason: "Снято с заказа",
        excluded: true,
      });
      continue;
    }
    if (!item.plantId || !item.plantCode) {
      remainder.push({
        variantId: item.variantId,
        name: item.name,
        quantity: item.quantity,
        reason: "У товара не задана производственная площадка",
      });
      continue;
    }
    const blockReason = lineBlockReason(item, hasRegion);
    if (blockReason) {
      remainder.push({
        variantId: item.variantId,
        name: item.name,
        quantity: item.quantity,
        reason: blockReason,
      });
      continue;
    }
    const list = byPlant.get(item.plantId) ?? [];
    list.push(item);
    byPlant.set(item.plantId, list);
  }

  const blocks: CheckoutBlock[] = deterministicPlantBlocks(byPlant);

  return {
    mode,
    hubAvailable: Boolean(hubWarehouseId),
    hubUnavailableReason: null,
    blocks,
    remainder,
  };
};

const deterministicPlantBlocks = (byPlant: Map<string, CheckoutCartItem[]>): CheckoutBlock[] => {
  const blocks: CheckoutBlock[] = [];
  const plantIds = [...byPlant.keys()].sort((a, b) => Number(a) - Number(b));
  for (const plantId of plantIds) {
    const items = byPlant.get(plantId) ?? [];
    const plantCode = items[0]?.plantCode ?? formatEntityCode("plant", plantId);
    const lines: CheckoutBlockLine[] = items.map((item) => {
      const dealerPrice = item.dealerPrice as number;
      const currency = item.dealerCurrency as CurrencyCode;
      return {
        variantId: item.variantId,
        name: item.name,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        included: true,
        blockReason: null,
        plantCode,
        hubReady: item.hubReady,
        pricing: {
          unitPrice: dealerPrice,
          currency,
          supplyCostPercent: 0,
          supplyCostAmount: 0,
          lineTotal: dealerPrice * item.quantity,
          fromStock: null,
          onOrder: null,
        },
      };
    });
    blocks.push({
      id: `plant:${plantId}`,
      mode: "plant",
      sourceId: plantId,
      sourceCode: plantCode,
      lines,
      supplyCostTotals: [],
      currencyTotals: currencyTotalsFromLines(lines),
    });
  }
  return blocks;
};

/** RPC lines of a block: only checked, priced lines, at the price shown (with Supply costs for the hub). */
export const buildCheckoutOrderLines = (
  block: CheckoutBlock,
): Array<{ productVariantId: string; quantity: number; unitPrice: number }> =>
  block.lines.flatMap((line) =>
    line.included && line.pricing
      ? [{ productVariantId: line.variantId, quantity: line.quantity, unitPrice: line.pricing.unitPrice }]
      : [],
  );

export const blockHasSubmittableLines = (block: CheckoutBlock): boolean =>
  block.lines.some((line) => line.included && line.pricing);

export type CheckoutBlockOutcome<T> =
  | { blockId: string; ok: true; value: T }
  | { blockId: string; ok: false; message: string };

/** Submits blocks one by one; a failed block does not stop the rest. Blocks without lines are skipped. */
export const submitCheckoutBlocks = async <T>(
  blocks: readonly CheckoutBlock[],
  submit: (block: CheckoutBlock) => Promise<T>,
): Promise<Array<CheckoutBlockOutcome<T>>> => {
  const outcomes: Array<CheckoutBlockOutcome<T>> = [];
  for (const block of blocks) {
    if (!blockHasSubmittableLines(block)) continue;
    try {
      outcomes.push({ blockId: block.id, ok: true, value: await submit(block) });
    } catch (caught: unknown) {
      outcomes.push({
        blockId: block.id,
        ok: false,
        message: caught instanceof Error ? caught.message : "Ошибка оформления",
      });
    }
  }
  return outcomes;
};

export type CheckoutGrandTotals = {
  byCurrency: Array<{ currency: CurrencyCode; total: number }>;
  orderCurrency: CurrencyCode;
  orderCurrencyTotal: number | null;
  ratesApproximate: boolean;
};

export const sumCheckoutTotals = (
  blocks: readonly CheckoutBlock[],
  orderCurrency: CurrencyCode,
  rates: OrderRates | null,
): CheckoutGrandTotals => {
  const map = new Map<CurrencyCode, number>();
  for (const block of blocks) {
    for (const row of block.currencyTotals) {
      map.set(row.currency, (map.get(row.currency) ?? 0) + row.total);
    }
  }
  const byCurrency = [...map.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  if (!rates) {
    return { byCurrency, orderCurrency, orderCurrencyTotal: null, ratesApproximate: true };
  }

  let orderTotal = 0;
  let ok = true;
  for (const row of byCurrency) {
    const converted = convert(row.total, row.currency, orderCurrency, rates);
    if (converted == null) {
      ok = false;
      break;
    }
    orderTotal += converted;
  }

  return {
    byCurrency,
    orderCurrency,
    orderCurrencyTotal: ok ? orderTotal : null,
    ratesApproximate: true,
  };
};
