import type { PricelistScope } from "./pricelists-demo-data";
import type { PriceField } from "./pricelists-helpers";

export type PricelistColumnId =
  | "name"
  | "purchase"
  | "purchaseUsd"
  | "dealer"
  | "dealerUsd"
  | "retail"
  | "retailUsd";

export type PricelistColumnKind = "name" | "editable" | "usd";

export type PricelistColumnDefinition = {
  id: PricelistColumnId;
  label: string;
  kind: PricelistColumnKind;
  field?: PriceField;
  widthClass: string;
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

export const PRICELIST_COLUMNS_BY_SCOPE: Record<PricelistScope, PricelistColumnDefinition[]> = {
  global: [NAME, PURCHASE, PURCHASE_USD],
  supplier: [NAME, PURCHASE, PURCHASE_USD, DEALER, DEALER_USD, RETAIL, RETAIL_USD],
  dealer: [NAME, DEALER, DEALER_USD, RETAIL, RETAIL_USD],
};
