import type { StoreCatalogItem } from "@/features/store/domain/catalog-item";
import type { CurrencyCode } from "@/features/store/domain/currency";
import {
  DEALER_STATUS_LABELS,
  RETAIL_STATUS_LABELS,
  type DealerStatus,
  type RetailStatus,
} from "@/features/store/domain/statuses";

export const formatPrice = (price: number, currency: CurrencyCode | string = "USD") =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(price)} ${currency}`;

export const formatCatalogPrice = (
  price: number | null,
  {
    from = false,
    currency = "USD",
  }: { from?: boolean; currency?: CurrencyCode | string | null } = {},
) => {
  if (price === null) {
    return "—";
  }
  const formatted = formatPrice(price, currency ?? "USD");
  return from ? `от ${formatted}` : formatted;
};

export const isPurchasable = (dealerStatus: DealerStatus) => dealerStatus === "available";

type PurchasableCatalogItem = Pick<StoreCatalogItem, "dealerStatus" | "dealerPrice">;

export const getPurchaseBlockReason = (item: PurchasableCatalogItem): string | null => {
  if (item.dealerStatus === "unavailable") {
    return "Товар временно недоступен для заказа.";
  }

  if (item.dealerPrice === null) {
    return "Для товара не задана дилерская цена.";
  }

  return null;
};

export const formatCatalogStatus = (status: DealerStatus | RetailStatus): string =>
  DEALER_STATUS_LABELS[status as DealerStatus] ?? RETAIL_STATUS_LABELS[status as RetailStatus] ?? status;

export const statusBadgeClassMap: Record<DealerStatus | RetailStatus, string> = {
  available: "bg-emerald-100 text-emerald-700",
  unavailable: "bg-rose-100 text-rose-700",
  draft: "bg-zinc-100 text-zinc-700",
  preorder: "bg-amber-100 text-amber-700",
  temporarily_unavailable: "bg-indigo-100 text-indigo-700",
  discontinued: "bg-orange-100 text-orange-800",
  banned: "bg-rose-100 text-rose-800",
  hidden: "bg-zinc-100 text-zinc-700",
  pending_approval: "bg-sky-100 text-sky-700",
  archived: "bg-zinc-100 text-zinc-700",
};
