// english-ui:ignore-file
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  hrefForManufacturer,
  hrefForProduct,
  hrefForWarehouse,
  sumFreeForProduct,
} from "@/features/logistics/logistics-availability";
import { summarizeProductStock } from "@/features/logistics/logistics-balances";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { warehouseOwnerLabel } from "@/features/logistics/logistics-lookups";
import { stockHref } from "@/features/logistics/stock-filters";
import {
  relatedProductionsForManufacturer,
  relatedProductionsForWarehouse,
  relatedShipmentsForWarehouse,
  relatedTransfersForWarehouse,
} from "@/features/logistics/logistics-related";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { ProductActivityCard } from "@/features/logistics/ui/product-activity-card";
import { ProductBalancesTable } from "@/features/logistics/ui/product-balances-table";
import { RelatedDocuments, RelatedDocumentsBoard } from "@/features/logistics/ui/related-documents";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  createManufacturer,
  createProduct,
  createProductionOrder,
  createWarehouse,
  updateManufacturer,
  updateWarehouse,
} from "@/features/logistics/logistics-api";
import {
  linkedManufacturersForProduct,
  manufacturerSelectItems,
  productById,
  warehouseById,
} from "@/features/logistics/logistics-lookups";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ManufacturerLink } from "@/features/logistics/ui/manufacturer-link";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsMetaField, LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { ProductPhoto } from "@/features/store/product-photo";

export const ProductsPage = () => {
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("шт");

  const create = async () => {
    if (!sku.trim() || !name.trim() || !unit.trim()) {
      toast.error("Заполните артикул, название и единицу");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createProduct({
          sku: sku.trim(),
          name: name.trim(),
          unit: unit.trim(),
        }),
      "Товар добавлен",
      reload,
    );
    if (ok) {
      setOpen(false);
      setSku("");
      setName("");
      setUnit("шт");
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
        <LogisticsTableCard headers={["Код", "Артикул", "Название", "Ед.", "Свободно"]} isEmpty={snapshot.products.length === 0}>
          {snapshot.products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="px-3 py-2">
                <LogisticsCodeBadge code={product.code} href={hrefForProduct(product.id)} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                <Link href={hrefForProduct(product.id)} className="hover:underline">
                  {product.sku}
                </Link>
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

      <LogisticsDialog
        open={open}
        onOpenChange={setOpen}
        title="Новый товар"
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Артикул</span>
            <Input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="CHAIR-OAK" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Дубовый стул" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Единица</span>
            <Input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="шт" />
          </label>
          <Button type="button" onClick={() => void create()}>
            Добавить
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const ProductDetailPage = ({ productId }: { productId?: string } = {}) => {
  const params = useParams<{ id?: string; productId?: string }>();
  const resolvedProductId = productId ?? params.productId ?? params.id;
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [productionOpen, setProductionOpen] = useState(false);
  const [manufacturerId, setManufacturerId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const product = snapshot.products.find((item) => item.id === resolvedProductId);
  const plants = product ? linkedManufacturersForProduct(snapshot, product.id) : [];
  const plantItems = product ? manufacturerSelectItems(snapshot, [product.id]) : [];
  const productCode = product?.code;

  const openProduction = () => {
    setManufacturerId(plantItems.length === 1 ? plantItems[0].value : "");
    setQuantity("1");
    setExpectedEndOn("");
    setProductionOpen(true);
  };

  const createProduction = async () => {
    if (!product || !manufacturerId || !(Number(quantity) > 0)) {
      toast.error("Выберите завод и количество");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createProductionOrder({
          manufacturerId,
          expectedEndOn: expectedEndOn || null,
          lines: [{ productId: product.id, quantity: Number(quantity) }],
        }),
      "Заказ на производство создан",
      reload,
    );
    if (ok) {
      setProductionOpen(false);
      setManufacturerId("");
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
          <LogisticsMetaField label="Производители">
            <span className="text-sm">
              {plants.map((plant, index) => (
                <span key={plant.id}>
                  {index > 0 ? ", " : null}
                  <ManufacturerLink snapshot={snapshot} manufacturerId={plant.id} />
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

      <LogisticsDialog
        open={productionOpen}
        onOpenChange={(next) => {
          setProductionOpen(next);
          if (next) {
            setManufacturerId(plantItems.length === 1 ? plantItems[0].value : "");
            setQuantity("1");
            setExpectedEndOn("");
          }
        }}
        title="Новый заказ на производство"
      >
        <div className="flex flex-col gap-3">
          <FieldSelect
            label="Производитель"
            value={manufacturerId}
            items={plantItems}
            onChange={setManufacturerId}
            placeholder="Выберите производителя"
          />
          {plants.length > 0 ? (
            <p className="text-xs text-muted-foreground">Только заводы, где производится этот товар.</p>
          ) : (
            <p className="text-xs text-muted-foreground">У товара нет связанного завода — доступны все площадки.</p>
          )}
          <ExpectedEndField value={expectedEndOn} onChange={setExpectedEndOn} />
          <label className="space-y-1 text-sm">
            <span className="font-medium">Количество</span>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              aria-label="Количество"
            />
          </label>
          <Button type="button" disabled={!manufacturerId || !(Number(quantity) > 0)} onClick={() => void createProduction()}>
            Создать
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const WarehousesPage = () => {
  const { snapshot, isLoading, error, reload } = useLogisticsStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = async () => {
    if (!name.trim()) {
      toast.error("Укажите название склада");
      return;
    }
    const ok = await runLogisticsAction(
      () => createWarehouse({ name: name.trim() }),
      "Склад добавлен",
      reload,
    );
    if (ok) {
      setOpen(false);
      setName("");
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Склады" }]}>
      <LogisticsToolbar
        title="Склады"
        actionLabel="Новый склад"
        onAction={() => setOpen(true)}
      />
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Код", "Название", "Производитель"]} isEmpty={snapshot.warehouses.length === 0}>
          {snapshot.warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell className="px-3 py-2">
                <LogisticsCodeBadge code={warehouse.code} href={hrefForWarehouse(warehouse.id)} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">
                <Link href={hrefForWarehouse(warehouse.id)} className="text-primary hover:underline">
                  {warehouse.name}
                </Link>
              </TableCell>
              <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                {warehouse.manufacturerId ? (
                  <ManufacturerLink snapshot={snapshot} manufacturerId={warehouse.manufacturerId} />
                ) : (
                  warehouseOwnerLabel(snapshot, warehouse.id)
                )}
              </TableCell>
            </TableRow>
          ))}
        </LogisticsTableCard>
      ) : null}

      <LogisticsDialog
        open={open}
        onOpenChange={setOpen}
        title="Новый склад"
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dubai Hub" />
          </label>
          <Button type="button" onClick={() => void create()}>
            Добавить
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const WarehouseDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const warehouse = snapshot.warehouses.find((item) => item.id === params.id);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");

  const stock = warehouse
    ? summarizeProductStock(balances, {
      place: { kind: "warehouse", warehouseId: warehouse.id },
      stockState: "all",
    })
    : [];
  const transfers = warehouse ? relatedTransfersForWarehouse(snapshot, warehouse.id) : [];
  const shipments = warehouse ? relatedShipmentsForWarehouse(snapshot, warehouse.id) : [];
  const productions = warehouse ? relatedProductionsForWarehouse(snapshot, warehouse.id) : [];

  const openEdit = () => {
    setName(warehouse?.name ?? "");
    setEditOpen(true);
  };

  const save = async () => {
    if (!warehouse || !name.trim()) {
      toast.error("Укажите название склада");
      return;
    }
    const ok = await runLogisticsAction(
      () => updateWarehouse({ id: warehouse.id, name: name.trim() }),
      "Склад обновлён",
      reload,
    );
    if (ok) {
      setEditOpen(false);
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
            {warehouse.manufacturerId ? (
              <Link
                href={hrefForManufacturer(warehouse.manufacturerId)}
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
        <RelatedDocuments title="Отгрузки" href="/store/logistics/shipments" items={shipments} />
        {productions.length > 0 ? (
          <RelatedDocuments title="Заказы на производство" href="/store/logistics/production-orders" items={productions} />
        ) : null}
      </RelatedDocumentsBoard>
      <DocumentLedger
        snapshot={snapshot}
        hide="location"
        filter={(entry) => entry.locationType === "warehouse" && entry.locationId === warehouse.id}
      />

      <LogisticsDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Склад"
      >
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Код: <LogisticsCodeBadge code={warehouse.code} />
          </p>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dubai Hub" />
          </label>
          <p className="text-sm text-muted-foreground">Производитель: {owner}</p>
          <Button type="button" onClick={() => void save()}>
            Сохранить
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const ManufacturersPage = () => {
  const { snapshot, isLoading, error, reload } = useLogisticsStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = async () => {
    if (!name.trim()) {
      toast.error("Укажите название производителя");
      return;
    }
    const ok = await runLogisticsAction(
      () => createManufacturer({ name: name.trim() }),
      "Производитель добавлен",
      reload,
    );
    if (ok) {
      setOpen(false);
      setName("");
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Производители" }]}>
      <LogisticsToolbar
        title="Производители"
        actionLabel="Новый производитель"
        onAction={() => setOpen(true)}
      />
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Код", "Название", "Склад"]} isEmpty={snapshot.manufacturers.length === 0}>
          {snapshot.manufacturers.map((manufacturer) => (
            <TableRow key={manufacturer.id}>
              <TableCell className="px-3 py-2">
                <LogisticsCodeBadge code={manufacturer.code} href={hrefForManufacturer(manufacturer.id)} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">
                <Link href={hrefForManufacturer(manufacturer.id)} className="text-primary hover:underline">
                  {manufacturer.name}
                </Link>
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">
                <WarehouseLink snapshot={snapshot} warehouseId={manufacturer.warehouseId} />
              </TableCell>
            </TableRow>
          ))}
        </LogisticsTableCard>
      ) : null}

      <LogisticsDialog
        open={open}
        onOpenChange={setOpen}
        title="Новый производитель"
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ZHEJIANG TAOTAO VEHICLES CO.,LTD" />
          </label>
          <Button type="button" onClick={() => void create()}>
            Добавить
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const ManufacturerDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const manufacturer = snapshot.manufacturers.find((item) => item.id === params.id);
  const warehouse = manufacturer ? warehouseById(snapshot, manufacturer.warehouseId) : undefined;
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");

  const stock = warehouse
    ? summarizeProductStock(balances, {
      place: { kind: "warehouse", warehouseId: warehouse.id },
      stockState: "all",
    })
    : [];
  const productions = manufacturer ? relatedProductionsForManufacturer(snapshot, manufacturer.id) : [];

  const openEdit = () => {
    setName(manufacturer?.name ?? "");
    setEditOpen(true);
  };

  const save = async () => {
    if (!manufacturer || !name.trim()) {
      toast.error("Укажите название производителя");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        updateManufacturer({
          id: manufacturer.id,
          name: name.trim(),
        }),
      "Производитель обновлён",
      reload,
    );
    if (ok) {
      setEditOpen(false);
    }
  };

  if (isLoading || error || !manufacturer) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Производители", href: "/store/logistics/manufacturers" }, { label: "Производитель" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Производитель не найден."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={[{ label: "Производители", href: "/store/logistics/manufacturers" }, { label: manufacturer.name }]}>
      <LogisticsToolbar
        title={manufacturer.name}
        titleMeta={<LogisticsCodeBadge code={manufacturer.code} />}
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

      <LogisticsDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Производитель"
      >
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Код: <LogisticsCodeBadge code={manufacturer.code} />
          </p>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ZHEJIANG TAOTAO VEHICLES CO.,LTD" />
          </label>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Склад:{" "}
            {warehouse ? (
              <LogisticsCodeBadge code={warehouse.code} href={hrefForWarehouse(warehouse.id)} />
            ) : (
              manufacturer.warehouseId
            )}
          </p>
          <Button type="button" onClick={() => void save()}>
            Сохранить
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};
