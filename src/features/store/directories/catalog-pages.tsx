// english-ui:ignore-file
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hrefForPlant, hrefForWarehouse } from "@/features/oms/oms-availability";
import { summarizeProductStock } from "@/features/oms/oms-balances";
import { formatQuantity } from "@/features/oms/oms-labels";
import { productById, warehouseById, warehouseOwnerLabel } from "@/features/oms/oms-lookups";
import { stockHref } from "@/features/oms/stock-filters";
import {
  relatedAdjustmentsForWarehouse,
  relatedProductionsForPlant,
  relatedProductionsForWarehouse,
  relatedShipmentsForWarehouse,
  relatedTransfersForWarehouse,
} from "@/features/oms/oms-related";
import { DocumentLedger } from "@/features/oms/ui/document-ledger";
import { RelatedDocuments, RelatedDocumentsBoard } from "@/features/oms/ui/related-documents";
import { DialogShell } from "@/features/oms/ui/dialog-shell";
import { translateOmsError } from "@/features/oms/ui/run-action";
import { TableCell, TableRow } from "@/components/ui/table";
import { createPlant, createWarehouse, updatePlant, updateWarehouse } from "@/features/store/directories/directories-api";
import { FieldSelect } from "@/features/oms/ui/field-select";
import { OmsCodeBadge } from "@/features/oms/ui/oms-code-badge";
import { OmsError, OmsLoading } from "@/features/oms/ui/oms-state";
import {
  mapPlantRows,
  mapWarehouseRows,
  plantColumns,
  plantFilters,
  plantSortDefs,
  warehouseColumns,
  warehouseFilters,
  warehouseGroupDefs,
  warehouseSortDefs,
} from "@/features/oms/ui/list/catalog-list-configs";
import { OmsListPageContent } from "@/features/oms/ui/list/oms-list-page-content";
import { OmsPageShell } from "@/features/oms/ui/oms-page-shell";
import { OmsTableCard } from "@/features/oms/ui/oms-table-card";
import { OmsToolbar } from "@/features/oms/ui/oms-toolbar";
import { finishCreatedDocuments, type CreateIntent } from "@/features/oms/ui/open-created-documents";
import { useOmsStore } from "@/features/oms/use-oms-store";
import { ProductIdentity } from "@/features/oms/ui/product-identity";

export const WarehousesPage = () => {
  const router = useRouter();
  const { snapshot, isLoading, error, reload } = useOmsStore({ kind: "catalog" });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"hub" | "customer">("customer");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const catalogRows = mapWarehouseRows(snapshot).filter((row) => {
    const q = search.trim().toLowerCase();
    if (q && !row.code.toLowerCase().includes(q) && !row.name.toLowerCase().includes(q)) return false;
    if (typeFilter === "plant" && !row.plantOwned) return false;
    if (typeFilter === "standalone" && row.plantOwned) return false;
    return true;
  });

  const create = async (intent: CreateIntent) => {
    if (submitting || !name.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const id = await createWarehouse({ name: name.trim(), kind });
      setOpen(false);
      setName("");
      setKind("customer");
      await finishCreatedDocuments({
        intent,
        navigate: (href) => router.push(href),
        main: { href: hrefForWarehouse(id), label: "Склад" },
        message: "Склад создан",
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
    <OmsPageShell section={null} crumbs={[{ label: "Склады" }]}>
      <OmsListPageContent
        listId="warehouses"
        title="Склады"
        actionLabel="Новый склад"
        onAction={() => setOpen(true)}
        columns={warehouseColumns(snapshot)}
        sortDefs={warehouseSortDefs}
        groupDefs={warehouseGroupDefs}
        rows={catalogRows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        search={{ value: search, onChange: setSearch, placeholder: "Поиск: код или название" }}
        toggleOptions={[
          { value: "all", label: "Все" },
          { value: "plant", label: "Заводские" },
          { value: "standalone", label: "Самостоятельные" },
        ]}
        toggleValue={typeFilter}
        onToggleChange={setTypeFilter}
        toggleAriaLabel="Тип склада"
        filters={warehouseFilters}
        hasActiveFilters={search.trim().length > 0}
        onResetFilters={() => setSearch("")}
      />

      <DialogShell
        open={open}
        onOpenChange={setOpen}
        size="sm"
        kicker="Склады"
        title="Новый склад"
        submitLabel="Добавить"
        createIntents
        onSubmit={(intent) => void create(intent)}
        submitDisabled={!name.trim()}
        disabledReason="Укажите название"
        submitting={submitting}
        serverError={serverError}
        dirty={name.trim().length > 0 || kind !== "customer"}
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dubai Hub" />
          </label>
          <FieldSelect
            label="Тип склада"
            value={kind}
            items={[
              { value: "hub", label: "Склад-хаб" },
              { value: "customer", label: "Склад покупателя" },
            ]}
            onChange={(value) => setKind(value === "hub" ? "hub" : "customer")}
          />
        </div>
      </DialogShell>
    </OmsPageShell>
  );
};

export const WarehouseDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useOmsStore({
    kind: "place",
    placeKind: "warehouse",
    id: String(params.id ?? ""),
  });
  const warehouse = snapshot.warehouses.find((item) => item.id === params.id);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"hub" | "customer">("customer");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const stock = warehouse
    ? summarizeProductStock(balances, {
      place: { kind: "warehouse", warehouseId: warehouse.id },
      stockState: "all",
    })
    : [];
  const transfers = warehouse ? relatedTransfersForWarehouse(snapshot, warehouse.id) : [];
  const shipments = warehouse ? relatedShipmentsForWarehouse(snapshot, warehouse.id) : [];
  const productions = warehouse ? relatedProductionsForWarehouse(snapshot, warehouse.id) : [];
  const adjustments = warehouse ? relatedAdjustmentsForWarehouse(snapshot, warehouse.id) : [];

  const openEdit = () => {
    setName(warehouse?.name ?? "");
    setKind(warehouse?.kind === "hub" ? "hub" : "customer");
    setEditOpen(true);
  };

  const save = async () => {
    if (submitting || !warehouse || !name.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await updateWarehouse({
        id: warehouse.id,
        name: name.trim(),
        kind: warehouse.kind === "plant" ? "plant" : kind,
      });
      await reload();
      setEditOpen(false);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateOmsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || error || !warehouse) {
    return (
      <OmsPageShell section={null} crumbs={[{ label: "Склады", href: "/store/warehouses" }, { label: "Склад" }]}>
        {isLoading ? <OmsLoading /> : <OmsError message={error ?? "Склад не найден."} />}
      </OmsPageShell>
    );
  }

  const owner = warehouseOwnerLabel(snapshot, warehouse.id);

  return (
    <OmsPageShell section={null} crumbs={[{ label: "Склады", href: "/store/warehouses" }, { label: warehouse.name }]}>
      <OmsToolbar
        title={warehouse.name}
        titleMeta={<OmsCodeBadge code={warehouse.code} />}
        actions={
          <>
            <Link
              href={stockHref({ place: { kind: "warehouse", warehouseId: warehouse.id } })}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Остатки склада
            </Link>
            {warehouse.plantId ? (
              <Link
                href={hrefForPlant(warehouse.plantId)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {owner}
              </Link>
            ) : null}
            <Button type="button" size="sm" onClick={openEdit}>
              Редактировать
            </Button>
          </>
        }
      />
      <OmsTableCard
        title="Остатки"
        headers={["Товар", "Свободно", "Занято", "Всего"]}
        isEmpty={stock.length === 0}
        empty="На этом складе пока нет остатков."
      >
        {stock.map((row) => {
          const product = productById(snapshot, row.productId);
          const place = row.locations[0];
          return (
            <TableRow key={row.productId}>
              <TableCell className="px-3 py-2">
                <ProductIdentity snapshot={snapshot} productId={row.productId} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(place?.free ?? 0, product?.unit)}
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(place?.reserved ?? 0, product?.unit)}
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(row.total, product?.unit)}
              </TableCell>
            </TableRow>
          );
        })}
      </OmsTableCard>
      <RelatedDocumentsBoard columns={2}>
        <RelatedDocuments title="Перемещения" href="/store/oms/transfers" items={transfers} />
        <RelatedDocuments title="Отгрузки и возвраты" href="/store/oms/shipments" items={shipments} />
        {productions.length > 0 ? (
          <RelatedDocuments title="Заказы на производство" href="/store/oms/production-orders" items={productions} />
        ) : null}
        <RelatedDocuments title="Корректировки" href="/store/oms/adjustments" items={adjustments} />
      </RelatedDocumentsBoard>
      <DocumentLedger
        snapshot={snapshot}
        hide="location"
        filter={(entry) => entry.locationType === "warehouse" && entry.locationId === warehouse.id}
      />

      <DialogShell
        open={editOpen}
        onOpenChange={setEditOpen}
        size="sm"
        kicker={warehouse.code}
        title="Склад"
        submitLabel="Сохранить"
        pendingLabel="Сохраняем…"
        onSubmit={() => void save()}
        submitDisabled={!name.trim()}
        disabledReason="Укажите название"
        submitting={submitting}
        serverError={serverError}
        dirty={name.trim() !== warehouse.name || (warehouse.kind !== "plant" && kind !== warehouse.kind)}
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Код</span>
            <Input value={warehouse.code} readOnly />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dubai Hub" />
          </label>
          {warehouse.kind === "plant" ? (
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Тип склада</span>
              <Input value="Склад завода" readOnly />
            </label>
          ) : (
            <FieldSelect
              label="Тип склада"
              value={kind}
              items={[
                { value: "hub", label: "Склад-хаб" },
                { value: "customer", label: "Склад покупателя" },
              ]}
              onChange={(value) => setKind(value === "hub" ? "hub" : "customer")}
            />
          )}
        </div>
      </DialogShell>
    </OmsPageShell>
  );
};

export const PlantsPage = () => {
  const router = useRouter();
  const { snapshot, isLoading, error, reload } = useOmsStore({ kind: "catalog" });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const catalogRows = mapPlantRows(snapshot).filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
  });

  const create = async (intent: CreateIntent) => {
    if (submitting || !name.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const id = await createPlant({ name: name.trim() });
      setOpen(false);
      setName("");
      await finishCreatedDocuments({
        intent,
        navigate: (href) => router.push(href),
        main: { href: hrefForPlant(id), label: "Завод" },
        message: "Завод создан",
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
    <OmsPageShell section={null} crumbs={[{ label: "Заводы" }]}>
      <OmsListPageContent
        listId="plants"
        title="Заводы"
        actionLabel="Новый завод"
        onAction={() => setOpen(true)}
        columns={plantColumns}
        sortDefs={plantSortDefs}
        rows={catalogRows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        search={{ value: search, onChange: setSearch, placeholder: "Поиск: код или название" }}
        filters={plantFilters}
        hasActiveFilters={search.trim().length > 0}
        onResetFilters={() => setSearch("")}
      />

      <DialogShell
        open={open}
        onOpenChange={setOpen}
        size="sm"
        kicker="Заводы"
        title="Новый завод"
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
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ZHEJIANG TAOTAO VEHICLES CO.,LTD" />
        </label>
      </DialogShell>
    </OmsPageShell>
  );
};

export const PlantDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useOmsStore({
    kind: "place",
    placeKind: "plant",
    id: String(params.id ?? ""),
  });
  const plant = snapshot.plants.find((item) => item.id === params.id);
  const warehouse = plant ? warehouseById(snapshot, plant.warehouseId) : undefined;
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const stock = warehouse
    ? summarizeProductStock(balances, {
      place: { kind: "warehouse", warehouseId: warehouse.id },
      stockState: "all",
    })
    : [];
  const productions = plant ? relatedProductionsForPlant(snapshot, plant.id) : [];

  const openEdit = () => {
    setName(plant?.name ?? "");
    setEditOpen(true);
  };

  const save = async () => {
    if (submitting || !plant || !name.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await updatePlant({ id: plant.id, name: name.trim() });
      await reload();
      setEditOpen(false);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateOmsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || error || !plant) {
    return (
      <OmsPageShell section={null} crumbs={[{ label: "Заводы", href: "/store/plants" }, { label: "Завод" }]}>
        {isLoading ? <OmsLoading /> : <OmsError message={error ?? "Завод не найден."} />}
      </OmsPageShell>
    );
  }

  return (
    <OmsPageShell section={null} crumbs={[{ label: "Заводы", href: "/store/plants" }, { label: plant.name }]}>
      <OmsToolbar
        title={plant.name}
        titleMeta={<OmsCodeBadge code={plant.code} />}
        actions={
          <>
            {warehouse ? (
              <Link
                href={hrefForWarehouse(warehouse.id)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {warehouse.code}
              </Link>
            ) : null}
            <Link
              href={stockHref(warehouse ? { place: { kind: "warehouse", warehouseId: warehouse.id } } : {})}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Остатки склада
            </Link>
            <Button type="button" size="sm" onClick={openEdit}>
              Редактировать
            </Button>
          </>
        }
      />
      <OmsTableCard
        title="Остатки"
        headers={["Товар", "Свободно", "Занято", "Всего"]}
        isEmpty={stock.length === 0}
        empty="На складе производителя пока нет остатков."
      >
        {stock.map((row) => {
          const product = productById(snapshot, row.productId);
          const place = row.locations[0];
          return (
            <TableRow key={row.productId}>
              <TableCell className="px-3 py-2">
                <ProductIdentity snapshot={snapshot} productId={row.productId} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(place?.free ?? 0, product?.unit)}
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(place?.reserved ?? 0, product?.unit)}
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(row.total, product?.unit)}
              </TableCell>
            </TableRow>
          );
        })}
      </OmsTableCard>
      <RelatedDocumentsBoard columns={2}>
        <RelatedDocuments title="Заказы на производство" href="/store/oms/production-orders" items={productions} />
      </RelatedDocumentsBoard>
      {warehouse ? (
        <DocumentLedger
          snapshot={snapshot}
          hide="location"
          filter={(entry) => entry.locationType === "warehouse" && entry.locationId === warehouse.id}
        />
      ) : null}

      <DialogShell
        open={editOpen}
        onOpenChange={setEditOpen}
        size="sm"
        kicker={plant.code}
        title="Завод"
        submitLabel="Сохранить"
        pendingLabel="Сохраняем…"
        onSubmit={() => void save()}
        submitDisabled={!name.trim()}
        disabledReason="Укажите название"
        submitting={submitting}
        serverError={serverError}
        dirty={name.trim() !== plant.name}
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Код</span>
            <Input value={plant.code} readOnly />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ZHEJIANG TAOTAO VEHICLES CO.,LTD" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Склад</span>
            <Input value={warehouse?.code ?? plant.warehouseId} readOnly />
          </label>
        </div>
      </DialogShell>
    </OmsPageShell>
  );
};
