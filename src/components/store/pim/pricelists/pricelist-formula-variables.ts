/**
 * Built-in variables available inside parameter formulas. These are read-only
 * references shown in the parameter editor so the user knows which handles can
 * be used. Grouped by domain to keep the list scannable.
 */
export type FormulaVariable = {
  label: string;
  slug: string;
};

export type FormulaVariableGroup = {
  title: string;
  variables: FormulaVariable[];
};

export const FORMULA_VARIABLE_GROUPS: FormulaVariableGroup[] = [
  {
    title: "Region status",
    variables: [
      { label: "Region retail status", slug: "retail_status" },
      { label: "Region dealer status", slug: "dealer_status" },
    ],
  },
  {
    title: "Product",
    variables: [{ label: "Volume (cbm)", slug: "product_variant_volume" }],
  },
  {
    title: "Dealer price",
    variables: [
      { label: "Dealer price", slug: "dealer_price_amount" },
      { label: "Dealer currency", slug: "dealer_price_currency" },
      { label: "Dealer price (region dealer currency)", slug: "dealer_price_in_region_dealer_currency_amount" },
      { label: "Dealer price (region retail currency)", slug: "dealer_price_in_region_retail_currency_amount" },
    ],
  },
  {
    title: "Retail price",
    variables: [
      { label: "Expenses", slug: "expenses" },
      { label: "Retail markup", slug: "retail_price_markup" },
      { label: "Retail price", slug: "retail_price_amount" },
      { label: "Retail currency", slug: "retail_price_currency" },
    ],
  },
];
