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
    title: "Статус региона",
    variables: [
      { label: "Розничный статус региона", slug: "retail_status" },
      { label: "Дилерский статус региона", slug: "dealer_status" },
    ],
  },
  {
    title: "Товар",
    variables: [{ label: "Объём (м³)", slug: "product_variant_volume" }],
  },
  {
    title: "Дилерская цена",
    variables: [
      { label: "Дилерская цена", slug: "dealer_price_amount" },
      { label: "Валюта дилера", slug: "dealer_price_currency" },
      { label: "Дилерская цена (валюта дилера региона)", slug: "dealer_price_in_region_dealer_currency_amount" },
      { label: "Дилерская цена (розничная валюта региона)", slug: "dealer_price_in_region_retail_currency_amount" },
    ],
  },
  {
    title: "Розничная цена",
    variables: [
      { label: "Расходы", slug: "expenses" },
      { label: "Розничная наценка", slug: "retail_price_markup" },
      { label: "Розничная цена", slug: "retail_price_amount" },
      { label: "Розничная валюта", slug: "retail_price_currency" },
    ],
  },
];
