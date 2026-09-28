import {
  EDITABLE_ENTITY_CODE_FIELDS,
  entityCodePrefixesFromRows,
  getActiveEntityCodePrefixes,
  mergeEntityCodePrefixes,
  setActiveEntityCodePrefixes,
  type EntityCodePrefixes,
} from "@/lib/entity-codes";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type PrefixRow = { entity: string; number_prefix: string };

const requireClient = () => {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }
  return client;
};

const requireData = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    throw new Error("Supabase returned no data");
  }
  return data;
};

const fetchEntityCodePrefixes = async (): Promise<EntityCodePrefixes> => {
  const client = requireClient();
  const { data, error } = await client
    .from("store_code_prefix")
    .select("entity,number_prefix")
    .order("entity", { ascending: true });
  const rows = requireData(data, error).map((row) => ({
    entity: String((row as PrefixRow).entity),
    number_prefix: String((row as PrefixRow).number_prefix),
  }));
  const prefixes = entityCodePrefixesFromRows(rows);
  setActiveEntityCodePrefixes(prefixes);
  return prefixes;
};

let ensureRequest: Promise<void> | null = null;

/** Загружает префиксы один раз за сессию; при ошибке остаются дефолты реестра. */
export const ensureEntityCodePrefixes = (): Promise<void> => {
  if (!isSupabaseConfigured()) {
    return Promise.resolve();
  }
  ensureRequest ??= fetchEntityCodePrefixes()
    .then(() => undefined)
    .catch(() => {
      ensureRequest = null;
    });
  return ensureRequest;
};

export const loadEntityCodePrefixes = async (): Promise<EntityCodePrefixes> => {
  const prefixes = await fetchEntityCodePrefixes();
  ensureRequest = Promise.resolve();
  return prefixes;
};

export const saveEntityCodePrefixes = async (
  prefixes: EntityCodePrefixes,
): Promise<EntityCodePrefixes> => {
  const next = mergeEntityCodePrefixes(prefixes);
  const client = requireClient();
  for (const field of EDITABLE_ENTITY_CODE_FIELDS) {
    const { error } = await client.rpc("store_set_code_prefix", {
      p_entity: field.entity,
      p_prefix: next[field.entity],
    });
    if (error) {
      throw new Error(error.message);
    }
  }
  ensureRequest = Promise.resolve();
  setActiveEntityCodePrefixes(next);
  return getActiveEntityCodePrefixes();
};
