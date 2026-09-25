/** Правила ввода количеств в каталожной модалке и строках контекста. */

import { pluralTovar } from "@/features/logistics/category-tree";

export type QuantityLimitMode = "hard" | "soft" | "none";

export type QuantityIssue = {
  kind: "error" | "note";
  message: string;
};

export const DIRTY_CLOSE_PROMPT = "Закрыть без сохранения?";
export const SUBMIT_PENDING_LABEL = "Создаём…";
export const TRANSFER_SOURCE_PLACEHOLDER = "Выберите склад-источник, чтобы увидеть остаток";
export const SHOW_ALL_STOCK_LABEL = "Показать весь остаток склада";

export const formatLimitNumber = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
};

/** `allowNegative` — режим «±» корректировки. */
export const parseDecimalQuantity = (raw: string, allowNegative = false): number | null => {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const pattern = allowNegative ? /^-?\d+(\.\d{0,2})?$/ : /^\d+(\.\d{0,2})?$/;
  if (!pattern.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  if (!allowNegative && value < 0) return null;
  return value;
};

const NEGATIVE_DECIMAL = /^-\d+(\.\d{0,2})?$/;

export const quantityIssue = (
  raw: string,
  limit: number | null,
  mode: QuantityLimitMode,
): QuantityIssue | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  if (mode === "none") {
    if (parseDecimalQuantity(trimmed, true) == null) return { kind: "error", message: "Введите число" };
    return null;
  }
  if (NEGATIVE_DECIMAL.test(normalized)) return { kind: "error", message: "Не меньше 0" };
  const value = parseDecimalQuantity(trimmed);
  if (value == null) return { kind: "error", message: "Введите число" };
  if (value <= 0 || limit == null) return null;
  if (value - limit <= 1e-9) return null;
  const amount = formatLimitNumber(limit);
  if (mode === "hard") return { kind: "error", message: `максимум ${amount}` };
  return { kind: "note", message: `сверх остатка ${amount}` };
};

/** Пустая цена допустима. Отрицательная и нечисловая — ошибка у поля. */
export const priceIssue = (raw: string): QuantityIssue | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  if (NEGATIVE_DECIMAL.test(normalized)) return { kind: "error", message: "Не меньше 0" };
  if (parseDecimalQuantity(trimmed) == null) return { kind: "error", message: "Введите число" };
  return null;
};

export const sourceDropBanner = (count: number, plantCode: string): string =>
  `${pluralTovar(count)} ${plantCode} не выпускает — будут убраны`;

export const productsNotMadeByPlant = (
  enteredProductIds: string[],
  plantByProduct: Map<string, string | null>,
  plantId: string,
): string[] =>
  enteredProductIds.filter((productId) => plantByProduct.get(productId) !== plantId);

/** Пустой список без поиска раскрыт целиком; иначе открыты категории со значениями или с поиском. */
export const categoryStartsOpen = (
  hasEnteredQuantity: boolean,
  matchesSearch: boolean,
  context: { anyEntered: boolean; searching: boolean } = { anyEntered: false, searching: false },
): boolean => {
  if (!context.anyEntered && !context.searching) return true;
  return hasEnteredQuantity || matchesSearch;
};

export const firstErrorKey = (
  rows: Array<{ key: string; raw: string; limit: number | null; mode: QuantityLimitMode }>,
): string | null => {
  for (const row of rows) {
    const issue = quantityIssue(row.raw, row.limit, row.mode);
    if (issue?.kind === "error") return row.key;
  }
  return null;
};

export const enteredQuantityKeys = (quantities: Record<string, string>): string[] =>
  Object.entries(quantities)
    .filter(([, raw]) => {
      const value = parseDecimalQuantity(raw);
      return value != null && value !== 0;
    })
    .map(([key]) => key);
