// english-ui:ignore-file
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  hrefForPlant,
  hrefForProduct,
  hrefForWarehouse,
  sumFreeForProduct,
} from "@/features/logistics/logistics-availability";
import { summarizeProductStock } from "@/features/logistics/logistics-balances";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { warehouseOwnerLabel } from "@/features/logistics/logistics-lookups";
import { stockHref } from "@/features/logistics/stock-filters";
import {
  relatedAdjustmentsForWarehouse,
  relatedProductionsForPlant,
  relatedProductionsForWarehouse,
  relatedShipmentsForWarehouse,
  relatedTransfersForWarehouse,
} from "@/features/logistics/logistics-related";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { ProductActivityCard } from "@/features/logistics/ui/product-activity-card";
import { ProductBalancesTable } from "@/features/logistics/ui/product-balances-table";
import { RelatedDocuments, RelatedDocumentsBoard } from "@/features/logistics/ui/related-documents";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  createPlant,
  createProduct,
  createProductionOrder,
  createWarehouse,
  updatePlant,
  updateWarehouse,
} from "@/features/logistics/logistics-api";
import {
  linkedPlantsForProduct,
  plantSelectItems,
  productById,
  warehouseById,
} from "@/features/logistics/logistics-lookups";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { ProductionOrderCatalogDialog } from "@/features/logistics/ui/production-order-catalog-dialog";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { PlantLink } from "@/features/logistics/ui/plant-link";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import {
  mapPlantRows,
  mapWarehouseRows,
  plantColumns,
  plantSortDefs,
  warehouseColumns,
  warehouseGroupDefs,
  warehouseSortDefs,
} from "@/features/logistics/ui/list/catalog-list-configs";
import { LogisticsListPageContent } from "@/features/logistics/ui/list/logistics-list-page-content";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsMetaField, LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { ProductPhoto } from "@/features/store/product-photo";

export const ProductsPage = () => {
  const router = useRouter();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore({ kind: "stock" });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("шт");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const create = async () => {
    if (submitting || !name.trim() || !unit.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const id = await createProduct({ name: name.trim(), unit: unit.trim() });
      await reload();
      setOpen(false);
      setName("");
      setUnit("шт");
      router.push(hrefForProduct(id));
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Товары" }]}>
      <LogisticsToolbar
        title="Товары"
        actionLabel="Новый товар"
        onAction={() => setOpen(true)}
      />
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Код", "Название", "Ед.", "Свободно"]} isEmpty={snapshot.products.length === 0}>
          {snapshot.products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="px-3 py-2">
                <LogisticsCodeBadge code={product.code} href={hrefForProduct(product.id)} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">
                <Link href={hrefForProduct(product.id)} className="text-primary hover:underline">
                  {product.name}
                </Link>
              </TableCell>
              <TableCell className="px-3 py-2 text-sm text-muted-foreground">{product.unit}</TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(sumFreeForProduct(balances, product.id), product.unit)}
              </TableCell>
            </TableRow>
          ))}
        </LogisticsTableCard>
      ) : null}

      <DialogShell
        open={open}
        onOpenChange={setOpen}
        size="sm"
        kicker="Товары"
        title="Новый товар"
        submitLabel="Добавить"
        onSubmit={() => void create()}
        submitDisabled={!name.trim() || !unit.trim()}
        disabledReason="Заполните название и единицу"
        submitting={submitting}
        serverError={serverError}
        dirty={name.trim().length > 0 || unit !== "шт"}
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Дубовый стул" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Единица</span>
            <Input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="шт" />
          </label>
        </div>
      </DialogShell>
    </LogisticsPageShell>
  );
};

export const ProductDetailPage = ({ productId }: { productId?: string } = {}) => {
  const params = useParams<{ id?: string; productId?: string }>();
  const resolvedProductId = productId ?? params.productId ?? params.id;
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore({
    kind: "product",
    variantId: String(resolvedProductId ?? ""),
  });
  const [productionOpen, setProductionOpen] = useState(false);
  const [plantId, setPlantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const product = snapshot.products.find((item) => item.id === resolvedProductId);
  const plants = product ? linkedPlantsForProduct(snapshot, product.id) : [];
  const plantItems = product ? plantSelectItems(snapshot, [product.id]) : [];
  const productCode = product?.code;

  const openProduction = () => {
    setPlantId(plantItems.length === 1 ? plantItems[0].value : "");
    setQuantity("1");
    setExpectedEndOn("");
    setProductionOpen(true);
  };

  const createProduction = async () => {
    if (!product || !plantId || !(Number(quantity) > 0)) {
      toast.error("Выберите завод и количество");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createProductionOrder({
          plantId,
          expectedEndOn: expectedEndOn || null,
          lines: [{ productId: product.id, quantity: Number(quantity) }],
        }),
      "Заказ на производство создан",
      reload,
    );
    if (ok) {
      setProductionOpen(false);
      setPlantId("");
      setQuantity("1");
      setExpectedEndOn("");
    }
  };

  if (isLoading || error || !product) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Товары", href: "/store/pim/products" }, { label: "Товар" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Товар не найден."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={[{ label: "Товары", href: "/store/pim/products" }, { label: product.name }]}>
      <LogisticsToolbar
        title={product.name}
        leading={
          <ProductPhoto src={product.imageUrl} alt={product.name} sizes="80px" className="size-20" />
        }
        titleMeta={
          productCode ? <LogisticsCodeBadge code={productCode} /> : null
        }
        actions={
          <>
            <Link
              href={stockHref({ query: productCode || product.name })}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              В остатках
            </Link>
            <Button type="button" size="sm" onClick={openProduction}>
              Новый заказ на производство
            </Button>
          </>
        }
      >
        {plants.length > 0 ? (
          <LogisticsMetaField label="Заводы">
            <span className="text-sm">
              {plants.map((plant, index) => (
                <span key={plant.id}>
                  {index > 0 ? ", " : null}
                  <PlantLink snapshot={snapshot} plantId={plant.id} />
                </span>
              ))}
            </span>
          </LogisticsMetaField>
        ) : null}
      </LogisticsToolbar>
      <ProductBalancesTable
        snapshot={snapshot}
        balances={balances}
        productId={product.id}
        unit={product.unit}
      />
      <ProductActivityCard
        snapshot={snapshot}
        productId={product.id}
        unit={product.unit}
        onCreateProduction={openProduction}
      />
      <DocumentLedger snapshot={snapshot} hide="product" filter={(entry) => entry.productId === product.id} />

      <ProductionOrderCatalogDialog
        open={productionOpen}
        onOpenChange={setProductionOpen}
        snapshot={snapshot}
        balances={balances}
        presetProductId={product.id}
      />
    </LogisticsPageShell>
  );
};

export const WarehousesPage = () => {
  const router = useRouter();
  const { snapshot, isLoading, error, reload } = useLogisticsStore({ kind: "catalog" });
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

  const create = async () => {
    if (submitting || !name.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const id = await createWarehouse({ name: name.trim(), kind });
      await reload();
      setOpen(false);
      setName("");
      setKind("customer");
      router.push(hrefForWarehouse(id));
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Склады" }]}>
      <LogisticsListPageContent
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
      />

      <DialogShell
        open={open}
        onOpenChange={setOpen}
        size="sm"
        kicker="Склады"
        title="Новый склад"
        submitLabel="Добавить"
        onSubmit={() => void create()}
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
    </LogisticsPageShell>
  );
};

export const WarehouseDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore({
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
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || error || !warehouse) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Склады", href: "/store/logistics/warehouses" }, { label: "Склад" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Склад не найден."} />}
      </LogisticsPageShell>
    );
  }

  const owner = warehouseOwnerLabel(snapshot, warehouse.id);

  return (
    <LogisticsPageShell crumbs={[{ label: "Склады", href: "/store/logistics/warehouses" }, { label: warehouse.name }]}>
      <LogisticsToolbar
        title={warehouse.name}
        titleMeta={<LogisticsCodeBadge code={warehouse.code} />}
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
      <LogisticsTableCard
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
      </LogisticsTableCard>
      <RelatedDocumentsBoard columns={2}>
        <RelatedDocuments title="Перемещения" href="/store/logistics/transfers" items={transfers} />
        <RelatedDocuments title="Отгрузки и возвраты" href="/store/logistics/shipments" items={shipments} />
        {productions.length > 0 ? (
          <RelatedDocuments title="Заказы на производство" href="/store/logistics/production-orders" items={productions} />
        ) : null}
        <RelatedDocuments title="Корректировки" href="/store/logistics/adjustments" items={adjustments} />
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
    </LogisticsPageShell>
  );
};

export const PlantsPage = () => {
  const router = useRouter();
  const { snapshot, isLoading, error, reload } = useLogisticsStore({ kind: "catalog" });
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

  const create = async () => {
    if (submitting || !name.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const id = await createPlant({ name: name.trim() });
      await reload();
      setOpen(false);
      setName("");
      router.push(hrefForPlant(id));
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Заводы" }]}>
      <LogisticsListPageContent
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
      />

      <DialogShell
        open={open}
        onOpenChange={setOpen}
        size="sm"
        kicker="Заводы"
        title="Новый завод"
        submitLabel="Добавить"
        onSubmit={() => void create()}
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
    </LogisticsPageShell>
  );
};

export const PlantDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore({
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
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || error || !plant) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Заводы", href: "/store/logistics/plants" }, { label: "Завод" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Завод не найден."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={[{ label: "Заводы", href: "/store/logistics/plants" }, { label: plant.name }]}>
      <LogisticsToolbar
        title={plant.name}
        titleMeta={<LogisticsCodeBadge code={plant.code} />}
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
      <LogisticsTableCard
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
      </LogisticsTableCard>
      <RelatedDocumentsBoard columns={2}>
        <RelatedDocuments title="Заказы на производство" href="/store/logistics/production-orders" items={productions} />
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
    </LogisticsPageShell>
  );
};
