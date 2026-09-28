export type EntityCodeDefinition = {
  defaultPrefix: string;
  label: string;
  exampleId: string;
  fixed?: boolean;
};

export const ENTITY_CODES = {
  customer_order: {
    defaultPrefix: "OMS",
    label: "Заказы клиента",
    exampleId: "12",
  },
  production_order: {
    defaultPrefix: "PO",
    label: "Заказы на производство",
    exampleId: "1",
  },
  reservation: {
    defaultPrefix: "RSV",
    label: "Резервы",
    exampleId: "1",
  },
  transfer: {
    defaultPrefix: "TR",
    label: "Перемещения",
    exampleId: "1",
  },
  shipment: {
    defaultPrefix: "SHP",
    label: "Отгрузки и возвраты",
    exampleId: "1",
  },
  production_output: {
    defaultPrefix: "OUT",
    label: "Выпуски",
    exampleId: "1",
  },
  adjustment: {
    defaultPrefix: "ADJ",
    label: "Корректировки",
    exampleId: "1",
  },
  stock_transaction: {
    defaultPrefix: "TXN",
    label: "Проводки",
    exampleId: "1",
    fixed: true as const,
  },
  plant: {
    defaultPrefix: "PLT",
    label: "Заводы",
    exampleId: "4",
  },
  product: {
    defaultPrefix: "PRD",
    label: "Товары",
    exampleId: "12",
  },
  warehouse: {
    defaultPrefix: "WH",
    label: "Склады",
    exampleId: "7",
  },
  region: {
    defaultPrefix: "REG",
    label: "Регионы",
    exampleId: "3",
    fixed: true as const,
  },
} as const satisfies Record<string, EntityCodeDefinition>;

export type EntityCodeKind = keyof typeof ENTITY_CODES;
export type EntityCodePrefixes = { [K in EntityCodeKind]: string };

export type EntityCodeField = {
  entity: EntityCodeKind;
  label: string;
  exampleId: string;
};

const entityKinds = Object.keys(ENTITY_CODES) as EntityCodeKind[];

export const ENTITY_CODE_FIELDS: EntityCodeField[] = entityKinds.map((entity) => {
  const def = ENTITY_CODES[entity];
  return {
    entity,
    label: def.label,
    exampleId: def.exampleId,
  };
});

export const EDITABLE_ENTITY_CODE_FIELDS: EntityCodeField[] = ENTITY_CODE_FIELDS.filter(
  (field) => !(ENTITY_CODES[field.entity] as EntityCodeDefinition).fixed,
);

const defaultPrefixes = (): EntityCodePrefixes => {
  const next = {} as EntityCodePrefixes;
  for (const kind of entityKinds) {
    next[kind] = ENTITY_CODES[kind].defaultPrefix;
  }
  return next;
};

export const ENTITY_CODE_DEFAULTS: EntityCodePrefixes = defaultPrefixes();

const clonePrefixes = (prefixes: EntityCodePrefixes): EntityCodePrefixes => ({ ...prefixes });

let activePrefixes = clonePrefixes(ENTITY_CODE_DEFAULTS);

export const normalizeEntityCodePrefix = (value: string): string =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

export const mergeEntityCodePrefixes = (
  overrides?: Partial<Record<string, unknown>> | null,
): EntityCodePrefixes => {
  const next = clonePrefixes(ENTITY_CODE_DEFAULTS);
  if (!overrides) {
    return next;
  }
  for (const kind of entityKinds) {
    if ((ENTITY_CODES[kind] as EntityCodeDefinition).fixed) {
      continue;
    }
    const raw = overrides[kind];
    if (typeof raw !== "string") {
      continue;
    }
    const normalized = normalizeEntityCodePrefix(raw);
    if (normalized) {
      next[kind] = normalized;
    }
  }
  return next;
};

export const entityCodePrefixesFromRows = (
  rows: Array<{ entity: string; number_prefix: string }>,
): EntityCodePrefixes => {
  const overrides: Partial<Record<string, string>> = {};
  for (const row of rows) {
    overrides[row.entity] = row.number_prefix;
  }
  return mergeEntityCodePrefixes(overrides);
};

export const getActiveEntityCodePrefixes = (): EntityCodePrefixes => clonePrefixes(activePrefixes);

export const setActiveEntityCodePrefixes = (overrides?: Partial<Record<string, unknown>> | null) => {
  activePrefixes = mergeEntityCodePrefixes(overrides);
};

export const resetActiveEntityCodePrefixes = () => {
  activePrefixes = clonePrefixes(ENTITY_CODE_DEFAULTS);
};

export const formatEntityCode = (
  kind: EntityCodeKind,
  id: string | number | null | undefined,
  prefixes: EntityCodePrefixes = activePrefixes,
): string => {
  if (id == null || id === "") {
    return "";
  }
  const def = ENTITY_CODES[kind] as EntityCodeDefinition;
  const prefix = def.fixed ? def.defaultPrefix : prefixes[kind];
  return `${prefix}-${id}`;
};

/** Для сущностей с собственным сохранённым кодом (регион: `store_region.code`): `prefix-id` — только при пустом коде. */
export const storedEntityCode = (
  kind: EntityCodeKind,
  storedCode: unknown,
  id: string | number | null | undefined,
  prefixes: EntityCodePrefixes = activePrefixes,
): string => {
  const code = typeof storedCode === "string" ? storedCode.trim() : storedCode ? String(storedCode) : "";
  return code ? code : formatEntityCode(kind, id, prefixes);
};
