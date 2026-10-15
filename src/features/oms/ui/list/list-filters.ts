export type ListFilterOption = {
  value: string;
  label: string;
};

export type ListFilterOptionWithCount = ListFilterOption & { count: number };

export type ListRangeValue = { from: string; to: string };

type ListFilterBase = {
  id: string;
  label: string;
  /** Also rendered as a compact control in the toolbar row. */
  quick?: boolean;
};

/** Pick any of the values; a row matches when one of its values is selected. */
export type ListMultiFilterDef<TRow> = ListFilterBase & {
  kind: "multi";
  values: (row: TRow) => string | string[] | null | undefined;
  /** Label for a value seen in rows; `row` is the first row carrying it. */
  optionLabel?: (value: string, row: TRow) => string;
  /** Fixed option order and labels; values not listed are appended in label order. */
  options?: ListFilterOption[];
  /** How appended options are ordered. Defaults to `label`. */
  optionSort?: "label" | "number" | "none";
  /** Show a search field inside the option list. Defaults to on for more than 8 options. */
  searchable?: boolean;
  placeholder?: string;
};

export type ListDateRangeFilterDef<TRow> = ListFilterBase & {
  kind: "dateRange";
  value: (row: TRow) => string | null | undefined;
  /** Quick presets relative to today. Defaults to past periods. */
  presets?: "past" | "future" | "none";
};

export type ListNumberRangeFilterDef<TRow> = ListFilterBase & {
  kind: "numberRange";
  value: (row: TRow) => number | null | undefined;
  unit?: string;
  /** Allow negative bounds (e.g. signed adjustment quantity). */
  signed?: boolean;
};

export type ListFlagFilterDef<TRow> = ListFilterBase & {
  kind: "flag";
  match: (row: TRow) => boolean;
  description?: string;
};

export type ListFilterDef<TRow> =
  | ListMultiFilterDef<TRow>
  | ListDateRangeFilterDef<TRow>
  | ListNumberRangeFilterDef<TRow>
  | ListFlagFilterDef<TRow>;

export type ListFilterValue = string[] | ListRangeValue | boolean;

export type ListFilterState = Record<string, ListFilterValue | undefined>;

export const EMPTY_RANGE: ListRangeValue = { from: "", to: "" };

const isRange = (value: unknown): value is ListRangeValue =>
  typeof value === "object" && value !== null && !Array.isArray(value) && "from" in value && "to" in value;

const rowValues = <TRow>(def: ListMultiFilterDef<TRow>, row: TRow): string[] => {
  const raw = def.values(row);
  if (raw == null) return [];
  return (Array.isArray(raw) ? raw : [raw]).filter((value) => value !== "");
};

export const multiValue = (value: ListFilterValue | undefined): string[] => (Array.isArray(value) ? value : []);

export const rangeValue = (value: ListFilterValue | undefined): ListRangeValue => (isRange(value) ? value : EMPTY_RANGE);

export const flagValue = (value: ListFilterValue | undefined): boolean => value === true;

const parseNumber = (value: string): number | null => {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const pad = (value: number) => String(value).padStart(2, "0");

export const toLocalDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Calendar day of a date-only string or a timestamp, in the browser time zone. */
export const rowDateKey = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const time = Date.parse(value);
  return Number.isFinite(time) ? toLocalDateKey(new Date(time)) : null;
};

export const isListFilterActive = <TRow>(def: ListFilterDef<TRow>, value: ListFilterValue | undefined) => {
  if (def.kind === "multi") return multiValue(value).length > 0;
  if (def.kind === "flag") return flagValue(value);
  const range = rangeValue(value);
  if (def.kind === "numberRange") return parseNumber(range.from) != null || parseNumber(range.to) != null;
  return Boolean(range.from || range.to);
};

export const matchesListFilter = <TRow>(def: ListFilterDef<TRow>, value: ListFilterValue | undefined, row: TRow) => {
  if (!isListFilterActive(def, value)) return true;

  if (def.kind === "multi") {
    const selected = multiValue(value);
    return rowValues(def, row).some((item) => selected.includes(item));
  }

  if (def.kind === "flag") return def.match(row);

  const range = rangeValue(value);
  if (def.kind === "numberRange") {
    const actual = def.value(row);
    if (actual == null || Number.isNaN(actual)) return false;
    const min = parseNumber(range.from);
    const max = parseNumber(range.to);
    return (min == null || actual >= min) && (max == null || actual <= max);
  }

  const day = rowDateKey(def.value(row));
  if (!day) return false;
  return (!range.from || day >= range.from) && (!range.to || day <= range.to);
};

export const applyListFilters = <TRow>(
  rows: TRow[],
  defs: ListFilterDef<TRow>[],
  state: ListFilterState,
  exceptId?: string,
) => {
  const active = defs.filter((def) => def.id !== exceptId && isListFilterActive(def, state[def.id]));
  if (active.length === 0) return rows;
  return rows.filter((row) => active.every((def) => matchesListFilter(def, state[def.id], row)));
};

/**
 * Options of a multi filter with counts over `rows` (pass rows already narrowed by the
 * other filters). Selected values stay listed even when no row carries them anymore.
 */
export const buildListFilterOptions = <TRow>(
  def: ListMultiFilterDef<TRow>,
  rows: TRow[],
  selected: string[] = [],
): ListFilterOptionWithCount[] => {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const row of rows) {
    for (const value of new Set(rowValues(def, row))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
      if (!labels.has(value)) labels.set(value, def.optionLabel ? def.optionLabel(value, row) : value);
    }
  }

  const fixed = def.options ?? [];
  const fixedValues = new Set(fixed.map((option) => option.value));
  const fixedPart = fixed
    .filter((option) => counts.has(option.value) || selected.includes(option.value))
    .map((option) => ({ ...option, count: counts.get(option.value) ?? 0 }));

  const extraValues = [...new Set([...counts.keys(), ...selected])].filter((value) => !fixedValues.has(value));
  const extra = extraValues.map((value) => ({ value, label: labels.get(value) ?? value, count: counts.get(value) ?? 0 }));
  const sort = def.optionSort ?? "label";
  if (sort === "label") {
    extra.sort((left, right) => left.label.localeCompare(right.label, "ru", { numeric: true, sensitivity: "base" }));
  } else if (sort === "number") {
    extra.sort((left, right) => Number(left.value) - Number(right.value));
  }

  return [...fixedPart, ...extra];
};

const formatDay = (key: string) => {
  const [year, month, day] = key.split("-");
  return `${day}.${month}.${year}`;
};

const describeRange = (
  range: ListRangeValue,
  format: (value: string) => string,
  words: { from: string; to: string },
) => {
  if (range.from && range.to) return range.from === range.to ? format(range.from) : `${format(range.from)} – ${format(range.to)}`;
  if (range.from) return `${words.from} ${format(range.from)}`;
  return `${words.to} ${format(range.to)}`;
};

/** Short chip text for an active filter, e.g. «Завод: PLT-1, PLT-2». */
export const describeListFilter = <TRow>(
  def: ListFilterDef<TRow>,
  value: ListFilterValue | undefined,
  options: ListFilterOption[] = [],
): string => {
  if (def.kind === "flag") return def.label;
  if (def.kind === "multi") {
    const selected = multiValue(value);
    const labels = selected.map((item) => options.find((option) => option.value === item)?.label ?? item);
    const shown = labels.slice(0, 2).join(", ");
    return `${def.label}: ${labels.length > 2 ? `${shown} +${labels.length - 2}` : shown}`;
  }
  const range = rangeValue(value);
  if (def.kind === "dateRange") return `${def.label}: ${describeRange(range, formatDay, { from: "с", to: "по" })}`;
  const normalized = {
    from: parseNumber(range.from) == null ? "" : range.from.trim(),
    to: parseNumber(range.to) == null ? "" : range.to.trim(),
  };
  const unit = def.unit ? ` ${def.unit}` : "";
  return `${def.label}: ${describeRange(normalized, (item) => item, { from: "от", to: "до" })}${unit}`;
};

export type ListDatePreset = { id: string; label: string; range: () => ListRangeValue };

const shiftDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
};

const monthBounds = (offset: number) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  return { from: toLocalDateKey(start), to: toLocalDateKey(end) };
};

export const LIST_DATE_PRESETS: Record<"past" | "future", ListDatePreset[]> = {
  past: [
    { id: "today", label: "Сегодня", range: () => ({ from: shiftDays(0), to: shiftDays(0) }) },
    { id: "7d", label: "7 дней", range: () => ({ from: shiftDays(-6), to: shiftDays(0) }) },
    { id: "30d", label: "30 дней", range: () => ({ from: shiftDays(-29), to: shiftDays(0) }) },
    { id: "month", label: "Этот месяц", range: () => monthBounds(0) },
    { id: "prev-month", label: "Прошлый месяц", range: () => monthBounds(-1) },
  ],
  future: [
    { id: "past", label: "До сегодня", range: () => ({ from: "", to: shiftDays(-1) }) },
    { id: "today", label: "Сегодня", range: () => ({ from: shiftDays(0), to: shiftDays(0) }) },
    { id: "7d", label: "7 дней", range: () => ({ from: shiftDays(0), to: shiftDays(6) }) },
    { id: "month", label: "Этот месяц", range: () => monthBounds(0) },
    { id: "next-month", label: "Следующий месяц", range: () => monthBounds(1) },
  ],
};
