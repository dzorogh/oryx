export const LOGISTICS_CODE_PREFIXES = {
  product: "PRD",
  plant: "PLT",
  warehouse: "WH",
  region: "REG",
  customerOrder: "OMS",
  productionOrder: "PO",
  reservation: "RSV",
  transfer: "TR",
  shipment: "SHP",
  productionOutput: "OUT",
  adjustment: "ADJ",
  stockTransaction: "TXN",
} as const;

export type LogisticsCodeKind = keyof typeof LOGISTICS_CODE_PREFIXES;
export type LogisticsCodePrefixes = { [K in LogisticsCodeKind]: string };

/** Map DB document kind → code prefix field */
export const DOCUMENT_KIND_TO_PREFIX_FIELD: Record<string, LogisticsCodeKind> = {
  customer_order: "customerOrder",
  production_order: "productionOrder",
  reservation: "reservation",
  transfer: "transfer",
  shipment: "shipment",
  production_output: "productionOutput",
  adjustment: "adjustment",
};

/** Document kinds; editable catalog codes live in `CATALOG_PREFIX_FIELDS`. */
export const DOCUMENT_PREFIX_FIELDS: Array<{
  kind: LogisticsCodeKind;
  label: string;
  exampleId: string;
  documentKind: string;
}> = [
  { kind: "customerOrder", label: "Заказы клиента", exampleId: "12", documentKind: "customer_order" },
  { kind: "productionOrder", label: "Заказы на производство", exampleId: "1", documentKind: "production_order" },
  { kind: "reservation", label: "Резервы", exampleId: "1", documentKind: "reservation" },
  { kind: "transfer", label: "Перемещения", exampleId: "1", documentKind: "transfer" },
  { kind: "shipment", label: "Отгрузки и возвраты", exampleId: "1", documentKind: "shipment" },
  { kind: "productionOutput", label: "Выпуски", exampleId: "1", documentKind: "production_output" },
  { kind: "adjustment", label: "Корректировки", exampleId: "1", documentKind: "adjustment" },
];

/** Catalogs with an editable code prefix (`store_catalog_code_prefix`). Region stays fixed. */
export const CATALOG_PREFIX_FIELDS: Array<{
  kind: LogisticsCodeKind;
  label: string;
  exampleId: string;
  catalogCode: string;
}> = [
  { kind: "plant", label: "Заводы", exampleId: "4", catalogCode: "plant" },
  { kind: "product", label: "Товары", exampleId: "12", catalogCode: "product" },
  { kind: "warehouse", label: "Склады", exampleId: "7", catalogCode: "warehouse" },
];

export const CATALOG_CODE_TO_PREFIX_FIELD: Record<string, LogisticsCodeKind> = Object.fromEntries(
  CATALOG_PREFIX_FIELDS.map((field) => [field.catalogCode, field.kind]),
);

const FIXED_CODE_KINDS = new Set<LogisticsCodeKind>(["region"]);

const clonePrefixes = (prefixes: LogisticsCodePrefixes): LogisticsCodePrefixes => ({ ...prefixes });

let activePrefixes = clonePrefixes(LOGISTICS_CODE_PREFIXES);

export const normalizeLogisticsCodePrefix = (value: string): string =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

export const mergeLogisticsCodePrefixes = (
  overrides?: Partial<Record<string, unknown>> | null,
): LogisticsCodePrefixes => {
  const next = clonePrefixes(LOGISTICS_CODE_PREFIXES);
  if (!overrides) {
    return next;
  }
  for (const kind of Object.keys(LOGISTICS_CODE_PREFIXES) as LogisticsCodeKind[]) {
    const raw =
      overrides[kind] ??
      (kind === "productionOutput" ? overrides.output : undefined);
    if (typeof raw !== "string") {
      continue;
    }
    const normalized = normalizeLogisticsCodePrefix(raw);
    if (normalized) {
      next[kind] = normalized;
    }
  }
  return next;
};

export const getActiveLogisticsCodePrefixes = (): LogisticsCodePrefixes => clonePrefixes(activePrefixes);

export const setActiveLogisticsCodePrefixes = (overrides?: Partial<Record<string, unknown>> | null) => {
  activePrefixes = mergeLogisticsCodePrefixes(overrides);
};

export const resetLogisticsCodePrefixes = () => {
  activePrefixes = clonePrefixes(LOGISTICS_CODE_PREFIXES);
};

export const formatLogisticsCode = (
  kind: LogisticsCodeKind,
  id: string | number | null | undefined,
  prefixes: LogisticsCodePrefixes = activePrefixes,
): string => {
  if (id == null || id === "") {
    return "";
  }
  const prefix = FIXED_CODE_KINDS.has(kind) ? LOGISTICS_CODE_PREFIXES[kind] : prefixes[kind];
  return `${prefix}-${id}`;
};

/** Stored `store_region.code` wins; `REG-{id}` is only the empty-code fallback. */
export const regionCatalogCode = (
  storedCode: unknown,
  id: string | number | null | undefined,
  prefixes: LogisticsCodePrefixes = activePrefixes,
): string => {
  const code = typeof storedCode === "string" ? storedCode.trim() : storedCode ? String(storedCode) : "";
  return code ? code : formatLogisticsCode("region", id, prefixes);
};
