import type { PricelistScope } from "./pricelists-demo-data";
import type { PriceField } from "./pricelists-helpers";

export type PricelistColumnId =
  | "name"
  | "purchase"
  | "purchaseUsd"
  | "dealer"
  | "dealerUsd"
  | "retail"
  | "retailUsd"
  | "spacer";

export type PricelistColumnKind = "name" | "editable" | "usd" | "spacer";

export type PricelistColumnDefinition = {
  id: PricelistColumnId;
  label: string;
  kind: PricelistColumnKind;
  field?: PriceField;
  widthClass: string;
  headerAlign?: "left" | "right";
};

const NAME: PricelistColumnDefinition = {
  id: "name",
  label: "Name",
  kind: "name",
  widthClass: "w-[260px]",
};

const PURCHASE: PricelistColumnDefinition = {
  id: "purchase",
  label: "Purchase Price",
  kind: "editable",
  field: "purchase",
  widthClass: "w-[172px]",
};

const PURCHASE_USD: PricelistColumnDefinition = {
  id: "purchaseUsd",
  label: "",
  kind: "usd",
  field: "purchase",
  widthClass: "w-[136px]",
};

const DEALER: PricelistColumnDefinition = {
  id: "dealer",
  label: "Dealer Price",
  kind: "editable",
  field: "dealer",
  widthClass: "w-[172px]",
};

const DEALER_USD: PricelistColumnDefinition = {
  id: "dealerUsd",
  label: "",
  kind: "usd",
  field: "dealer",
  widthClass: "w-[136px]",
};

const RETAIL: PricelistColumnDefinition = {
  id: "retail",
  label: "Retail Price",
  kind: "editable",
  field: "retail",
  widthClass: "w-[172px]",
};

const RETAIL_USD: PricelistColumnDefinition = {
  id: "retailUsd",
  label: "",
  kind: "usd",
  field: "retail",
  widthClass: "w-[136px]",
};

// Dealer scope is read-only: prices render as right-aligned text instead of
// editable inputs, so the columns hug their content and the header sits above
// the values on the right. Widths stay roomy enough for large-currency amounts.
const DEALER_READONLY: PricelistColumnDefinition = {
  ...DEALER,
  widthClass: "w-[140px]",
  headerAlign: "right",
};

const DEALER_USD_READONLY: PricelistColumnDefinition = {
  ...DEALER_USD,
  widthClass: "w-[112px]",
};

const RETAIL_READONLY: PricelistColumnDefinition = {
  ...RETAIL,
  widthClass: "w-[140px]",
  headerAlign: "right",
};

const RETAIL_USD_READONLY: PricelistColumnDefinition = {
  ...RETAIL_USD,
  widthClass: "w-[112px]",
};

// Flexible trailing column that absorbs extra width so the data columns keep
// the same fixed widths as the Supplier scope instead of stretching to fill.
const SPACER: PricelistColumnDefinition = {
  id: "spacer",
  label: "",
  kind: "spacer",
  widthClass: "",
};

export const PRICELIST_COLUMNS_BY_SCOPE: Record<PricelistScope, PricelistColumnDefinition[]> = {
  global: [NAME, PURCHASE, PURCHASE_USD, SPACER],
  supplier: [NAME, PURCHASE, PURCHASE_USD, DEALER, DEALER_USD, RETAIL, RETAIL_USD, SPACER],
  dealer: [NAME, DEALER_READONLY, DEALER_USD_READONLY, RETAIL_READONLY, RETAIL_USD_READONLY, SPACER],
};
