export type EntityCodeGroup = "document" | "catalog";

export type EntityCodeDefinition = {
  defaultPrefix: string;
  group: EntityCodeGroup;
  label: string;
  exampleId: string;
  fixed?: boolean;
};

export const ENTITY_CODES = {
  customer_order: {
    defaultPrefix: "OMS",
    group: "document",
    label: "Заказы клиента",
    exampleId: "12",
  },
  production_order: {
    defaultPrefix: "PO",
    group: "document",
    label: "Заказы на производство",
    exampleId: "1",
  },
  reservation: {
    defaultPrefix: "RSV",
    group: "document",
    label: "Резервы",
    exampleId: "1",
  },
  transfer: {
    defaultPrefix: "TR",
    group: "document",
    label: "Перемещения",
    exampleId: "1",
  },
  shipment: {
    defaultPrefix: "SHP",
    group: "document",
    label: "Отгрузки и возвраты",
    exampleId: "1",
  },
  production_output: {
    defaultPrefix: "OUT",
    group: "document",
    label: "Выпуски",
    exampleId: "1",
  },
  adjustment: {
    defaultPrefix: "ADJ",
    group: "document",
    label: "Корректировки",
    exampleId: "1",
  },
  stock_transaction: {
    defaultPrefix: "TXN",
    group: "document",
    label: "Проводки",
    exampleId: "1",
    fixed: true as const,
  },
  plant: {
    defaultPrefix: "PLT",
    group: "catalog",
    label: "Заводы",
    exampleId: "4",
  },
  product: {
    defaultPrefix: "PRD",
    group: "catalog",
    label: "Товары",
    exampleId: "12",
  },
  warehouse: {
    defaultPrefix: "WH",
    group: "catalog",
    label: "Склады",
    exampleId: "7",
  },
  region: {
    defaultPrefix: "REG",
    group: "catalog",
    label: "Регионы",
    exampleId: "3",
    fixed: true as const,
  },
} as const satisfies Record<string, EntityCodeDefinition>;

export type EntityCodeKind = keyof typeof ENTITY_CODES;
export type EntityCodePrefixes = { [K in EntityCodeKind]: string };

export const ENTITY_CODE_GROUP_TITLES: Record<EntityCodeGroup, string> = {
  document: "Префиксы документов",
  catalog: "Префиксы справочников",
};

export type EntityCodeField = {
  entity: EntityCodeKind;
  label: string;
  exampleId: string;
  group: EntityCodeGroup;
};

const entityKinds = Object.keys(ENTITY_CODES) as EntityCodeKind[];

export const ENTITY_CODE_FIELDS: EntityCodeField[] = entityKinds.map((entity) => {
  const def = ENTITY_CODES[entity];
  return {
    entity,
    label: def.label,
    exampleId: def.exampleId,
    group: def.group,
  };
});

export const EDITABLE_ENTITY_CODE_FIELDS: EntityCodeField[] = ENTITY_CODE_FIELDS.filter(
  (field) => !(ENTITY_CODES[field.entity] as EntityCodeDefinition).fixed,
);

export const ENTITY_CODE_PREFIX_SECTIONS: Array<{ title: string; fields: EntityCodeField[] }> = (
  Object.keys(ENTITY_CODE_GROUP_TITLES) as EntityCodeGroup[]
).map((group) => ({
  title: ENTITY_CODE_GROUP_TITLES[group],
  fields: EDITABLE_ENTITY_CODE_FIELDS.filter((field) => field.group === group),
}));

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
