// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { hrefForRegion } from "@/features/oms/oms-availability";
import { createRegion, updateRegion } from "@/features/store/directories/directories-api";
import { formatEntityCode } from "@/lib/entity-codes";
import { formatQuantity } from "@/features/oms/oms-labels";
import { productById } from "@/features/oms/oms-lookups";
import { relatedReservationsForRegion } from "@/features/oms/oms-related";
import { documentKey, documentKeysForAssignedEntity } from "@/features/oms/oms-types";
import { DocumentLedger } from "@/features/oms/ui/document-ledger";
import { DialogShell } from "@/features/oms/ui/dialog-shell";
import { finishCreatedDocuments, type CreateIntent } from "@/features/oms/ui/open-created-documents";
import { translateOmsError } from "@/features/oms/ui/run-action";
import { OmsCodeBadge } from "@/features/oms/ui/oms-code-badge";
import { OmsError, OmsLoading } from "@/features/oms/ui/oms-state";
import { OmsPageShell } from "@/features/oms/ui/oms-page-shell";
import {
  mapRegionRows,
  regionColumns,
  regionFilters,
  regionSortDefs,
} from "@/features/oms/ui/list/catalog-list-configs";
import { OmsListPageContent } from "@/features/oms/ui/list/oms-list-page-content";
import { OmsTableCard } from "@/features/oms/ui/oms-table-card";
import { OmsToolbar } from "@/features/oms/ui/oms-toolbar";
import { RelatedDocuments } from "@/features/oms/ui/related-documents";
import { useOmsStore } from "@/features/oms/use-oms-store";
import { ProductIdentity } from "@/features/oms/ui/product-identity";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type HubOption = { id: string; code: string };
type CurrencyOption = { id: string; code: string };

const NO_HUB_VALUE = "none";
const NO_ORDER_CURRENCY_VALUE = "none";

const loadRegionHubMap = async (): Promise<{
  hubByRegionId: Map<string, string | null>;
  hubs: HubOption[];
  orderCurrencyByRegionId: Map<string, string | null>;
  currencies: CurrencyOption[];
}> => {
  if (!isSupabaseConfigured()) {
    return {
      hubByRegionId: new Map(),
      hubs: [],
      orderCurrencyByRegionId: new Map(),
      currencies: [],
    };
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return {
      hubByRegionId: new Map(),
      hubs: [],
      orderCurrencyByRegionId: new Map(),
      currencies: [],
    };
  }
  const [regionsResult, hubsResult, currenciesResult] = await Promise.all([
    client.from("store_region").select("id,hub_warehouse_id,order_currency_id").is("deleted_at", null),
    client.from("store_warehouse").select("id").eq("kind", "hub").is("deleted_at", null).order("id"),
    client.from("store_currency").select("id,code").is("deleted_at", null).order("code"),
  ]);
  if (regionsResult.error) throw new Error(regionsResult.error.message);
  if (hubsResult.error) throw new Error(hubsResult.error.message);
  if (currenciesResult.error) throw new Error(currenciesResult.error.message);
  const hubByRegionId = new Map<string, string | null>();
  const orderCurrencyByRegionId = new Map<string, string | null>();
  for (const row of (regionsResult.data ?? []) as Array<{
    id: number | string;
    hub_warehouse_id: number | string | null;
    order_currency_id: number | string | null;
  }>) {
    hubByRegionId.set(String(row.id), row.hub_warehouse_id == null ? null : String(row.hub_warehouse_id));
    orderCurrencyByRegionId.set(
      String(row.id),
      row.order_currency_id == null ? null : String(row.order_currency_id),
    );
  }
  const hubs: HubOption[] = ((hubsResult.data ?? []) as Array<{ id: number | string }>).map((row) => ({
    id: String(row.id),
    code: formatEntityCode("warehouse", row.id),
  }));
  const currencies: CurrencyOption[] = (
    (currenciesResult.data ?? []) as Array<{ id: number | string; code: string }>
  ).map((row) => ({ id: String(row.id), code: row.code }));
  return { hubByRegionId, hubs, orderCurrencyByRegionId, currencies };
};

export const RegionsPage = () => {
  const router = useRouter();
  const { snapshot, isLoading, error, reload } = useOmsStore({ kind: "catalog" });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hubByRegionId, setHubByRegionId] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void loadRegionHubMap()
      .then((loaded) => {
        if (!cancelled) setHubByRegionId(loaded.hubByRegionId);
      })
      .catch(() => {
        // Leave hub column empty on load failure.
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot.regions.length]);

  const hubCodeByRegionId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const [regionId, hubId] of hubByRegionId) {
      map.set(regionId, hubId ? formatEntityCode("warehouse", hubId) : null);
    }
    return map;
  }, [hubByRegionId]);

  const rows = mapRegionRows(snapshot, hubCodeByRegionId).filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      row.code.toLowerCase().includes(q) ||
      row.name.toLowerCase().includes(q) ||
      (row.hubCode ?? "").toLowerCase().includes(q)
    );
  });

  const create = async (intent: CreateIntent) => {
    if (submitting || !name.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const id = await createRegion({ name: name.trim() });
      setOpen(false);
      setName("");
      await finishCreatedDocuments({
        intent,
        navigate: (href) => router.push(href),
        main: { href: hrefForRegion(id), label: "Регион" },
        message: "Регион создан",
        refresh: reload,
      });
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateOmsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OmsPageShell section={null} crumbs={[{ label: "Регионы" }]}>
      <OmsListPageContent
        listId="regions"
        title="Регионы"
        actionLabel="Новый регион"
        onAction={() => setOpen(true)}
        columns={regionColumns}
        sortDefs={regionSortDefs}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        search={{ value: search, onChange: setSearch, placeholder: "Поиск: код или название" }}
        filters={regionFilters}
        hasActiveFilters={search.trim().length > 0}
        onResetFilters={() => setSearch("")}
        emptyMessage={snapshot.regions.length === 0 ? "Пока нет регионов." : undefined}
      />

      <DialogShell
        open={open}
        onOpenChange={setOpen}
        size="sm"
        kicker="Регионы"
        title="Новый регион"
        submitLabel="Добавить"
        createIntents
        onSubmit={(intent) => void create(intent)}
        submitDisabled={!name.trim()}
        disabledReason="Укажите название"
        submitting={submitting}
        serverError={serverError}
        dirty={name.trim().length > 0}
      >
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Название</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ОАЭ" />
        </label>
      </DialogShell>
    </OmsPageShell>
  );
};

export const RegionDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useOmsStore({
    kind: "place",
    placeKind: "region",
    id: String(params.id ?? ""),
  });
  const region = snapshot.regions.find((item) => item.id === params.id);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [hubWarehouseId, setHubWarehouseId] = useState<string>("");
  const [orderCurrencyId, setOrderCurrencyId] = useState<string>("");
  const [hubs, setHubs] = useState<HubOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [currentHubId, setCurrentHubId] = useState<string | null>(null);
  const [currentOrderCurrencyId, setCurrentOrderCurrencyId] = useState<string | null>(null);
  const [hubsLoaded, setHubsLoaded] = useState(false);
  const [hubsLoadError, setHubsLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHubsLoaded(false);
    setHubsLoadError(null);
    void loadRegionHubMap()
      .then((loaded) => {
        if (cancelled) return;
        setHubs(loaded.hubs);
        setCurrencies(loaded.currencies);
        const hubId = loaded.hubByRegionId.get(String(params.id ?? "")) ?? null;
        setCurrentHubId(hubId);
        setCurrentOrderCurrencyId(loaded.orderCurrencyByRegionId.get(String(params.id ?? "")) ?? null);
        setHubsLoaded(true);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setHubs([]);
        setCurrencies([]);
        setCurrentHubId(null);
        setCurrentOrderCurrencyId(null);
        setHubsLoaded(false);
        setHubsLoadError(caught instanceof Error ? caught.message : "Не удалось загрузить хабы.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, snapshot.regions.length]);

  const reserved = region
    ? balances.filter(
        (entry) =>
          entry.stockState === "reserved" &&
          entry.ownerType === "region" &&
          entry.ownerId === region.id &&
          Math.abs(entry.quantity) > 1e-9,
      )
    : [];
  const reservedByProduct = new Map<string, number>();
  for (const entry of reserved) {
    reservedByProduct.set(entry.productId, (reservedByProduct.get(entry.productId) ?? 0) + entry.quantity);
  }
  const stockRows = [...reservedByProduct.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  const reservations = region ? relatedReservationsForRegion(snapshot, region.id) : [];

  const openEdit = () => {
    setName(region?.name ?? "");
    setHubWarehouseId(currentHubId ?? "");
    setOrderCurrencyId(currentOrderCurrencyId ?? "");
    setEditOpen(true);
  };

  const save = async () => {
    if (submitting || !region || !name.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await updateRegion({
        id: region.id,
        name: name.trim(),
        hubWarehouseId: hubWarehouseId || null,
        orderCurrencyId: orderCurrencyId || null,
      });
      await reload();
      setCurrentHubId(hubWarehouseId || null);
      setCurrentOrderCurrencyId(orderCurrencyId || null);
      setEditOpen(false);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateOmsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || error || !region) {
    return (
      <OmsPageShell section={null} crumbs={[{ label: "Регионы", href: "/store/regions" }, { label: "Регион" }]}>
        {isLoading ? <OmsLoading /> : <OmsError message={error ?? "Регион не найден."} />}
      </OmsPageShell>
    );
  }

  const hubCode = currentHubId ? formatEntityCode("warehouse", currentHubId) : "—";
  const orderCurrencyCode =
    currencies.find((currency) => currency.id === currentOrderCurrencyId)?.code ?? "—";

  return (
    <OmsPageShell section={null} crumbs={[{ label: "Регионы", href: "/store/regions" }, { label: region.name }]}>
      <OmsToolbar
        title={region.name}
        titleMeta={<OmsCodeBadge code={region.code} />}
        actions={
          <Button type="button" size="sm" onClick={openEdit} disabled={!hubsLoaded}>
            Изменить
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        {hubsLoadError ? (
          <span className="text-destructive">{hubsLoadError}</span>
        ) : (
          <>
            Хаб: <span className="font-medium text-foreground tabular-nums">{hubCode}</span>
            {" · "}
            Валюта заказов:{" "}
            <span className="font-medium text-foreground tabular-nums">{orderCurrencyCode}</span>
          </>
        )}
      </p>
      <OmsTableCard
        title="Резерв"
        headers={["Товар", "Зарезервировано"]}
        isEmpty={stockRows.length === 0}
        empty="У региона пока нет резерва."
      >
        {stockRows.map(([productId, quantity]) => {
          const product = productById(snapshot, productId);
          return (
            <TableRow key={productId}>
              <TableCell className="px-3 py-2">
                <ProductIdentity snapshot={snapshot} productId={productId} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(quantity, product?.unit)}
              </TableCell>
            </TableRow>
          );
        })}
      </OmsTableCard>
      <RelatedDocuments title="Резервы" href="/store/oms/reservations" items={reservations} />
      <DocumentLedger
        snapshot={snapshot}
        filter={(entry) =>
          documentKeysForAssignedEntity(snapshot.transactions, "region", region.id).has(
            documentKey(entry.documentType, entry.documentId),
          )
        }
      />

      <DialogShell
        open={editOpen}
        onOpenChange={setEditOpen}
        size="sm"
        kicker={region.code}
        title="Регион"
        submitLabel="Сохранить"
        pendingLabel="Сохраняем…"
        onSubmit={() => void save()}
        submitDisabled={!name.trim()}
        disabledReason="Укажите название"
        submitting={submitting}
        serverError={serverError}
        dirty={
          name.trim() !== region.name ||
          (hubWarehouseId || null) !== (currentHubId || null) ||
          (orderCurrencyId || null) !== (currentOrderCurrencyId || null)
        }
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Код</span>
            <Input value={region.code} readOnly />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ОАЭ" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Хаб</span>
            <Select
              items={[
                { value: NO_HUB_VALUE, label: "Не задан" },
                ...hubs.map((hub) => ({ value: hub.id, label: hub.code })),
              ]}
              value={hubWarehouseId || NO_HUB_VALUE}
              onValueChange={(value) => setHubWarehouseId(!value || value === NO_HUB_VALUE ? "" : value)}
            >
              <SelectTrigger className="bg-background" aria-label="Хаб региона">
                <SelectValue placeholder="Выберите хаб" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_HUB_VALUE}>Не задан</SelectItem>
                  {hubs.map((hub) => (
                    <SelectItem key={hub.id} value={hub.id}>
                      {hub.code}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Валюта заказов</span>
            <Select
              items={[
                { value: NO_ORDER_CURRENCY_VALUE, label: "Как дилерская" },
                ...currencies.map((currency) => ({ value: currency.id, label: currency.code })),
              ]}
              value={orderCurrencyId || NO_ORDER_CURRENCY_VALUE}
              onValueChange={(value) =>
                setOrderCurrencyId(!value || value === NO_ORDER_CURRENCY_VALUE ? "" : value)
              }
            >
              <SelectTrigger className="bg-background" aria-label="Валюта заказов региона">
                <SelectValue placeholder="Валюта заказов" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_ORDER_CURRENCY_VALUE}>Как дилерская</SelectItem>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.code}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        </div>
      </DialogShell>
    </OmsPageShell>
  );
};
