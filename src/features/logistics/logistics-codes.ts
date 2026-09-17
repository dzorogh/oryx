export const LOGISTICS_CODE_PREFIXES = {
  product: "PRD",
  manufacturer: "PLT",
  warehouse: "WH",
  customerOrder: "OMS",
  productionOrder: "PO",
  reservation: "RSV",
  transfer: "TR",
  shipment: "SHP",
  output: "OUT",
  return: "RET",
  customerOrderLine: "COL",
  productionOrderLine: "POL",
  reservationLine: "RSVL",
  transferLine: "TRL",
  transferAllocation: "TRA",
  shipmentLine: "SHL",
  outputLine: "OUTL",
  outputAllocation: "OUA",
  returnLine: "RETL",
  productManufacturer: "PM",
  stockTransaction: "TXN",
  setting: "SET",
} as const;

export type LogisticsCodeKind = keyof typeof LOGISTICS_CODE_PREFIXES;
export type LogisticsCodePrefixes = { [K in LogisticsCodeKind]: string };

export const DOCUMENT_PREFIX_FIELDS: Array<{
  kind: LogisticsCodeKind;
  label: string;
  exampleId: string;
}> = [
  { kind: "customerOrder", label: "Customer orders", exampleId: "12" },
  { kind: "productionOrder", label: "Production orders", exampleId: "1" },
  { kind: "reservation", label: "Reservations", exampleId: "1" },
  { kind: "transfer", label: "Transfers", exampleId: "1" },
  { kind: "shipment", label: "Shipments", exampleId: "1" },
  { kind: "output", label: "Outputs", exampleId: "1" },
  { kind: "return", label: "Returns", exampleId: "1" },
  { kind: "product", label: "Products", exampleId: "1" },
  { kind: "manufacturer", label: "Plants", exampleId: "7" },
  { kind: "warehouse", label: "Warehouses", exampleId: "1" },
];

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
    const raw = overrides[kind];
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
  return `${prefixes[kind]}-${id}`;
};
