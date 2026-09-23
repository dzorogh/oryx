// english-ui:ignore-file
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { hrefForRegion } from "@/features/logistics/logistics-availability";
import { createRegion, updateRegion } from "@/features/logistics/logistics-api";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { productById } from "@/features/logistics/logistics-lookups";
import { relatedReservationsForRegion } from "@/features/logistics/logistics-related";
import { documentKey, documentKeysForAssignedEntity } from "@/features/logistics/logistics-types";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import {
  mapRegionRows,
  regionColumns,
  regionSortDefs,
} from "@/features/logistics/ui/list/catalog-list-configs";
import { LogisticsListPageContent } from "@/features/logistics/ui/list/logistics-list-page-content";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { RelatedDocuments } from "@/features/logistics/ui/related-documents";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";

export const RegionsPage = () => {
  const { snapshot, isLoading, error, reload } = useLogisticsStore({ kind: "catalog" });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const rows = mapRegionRows(snapshot).filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
  });

  const create = async () => {
    if (!name.trim()) {
      toast.error("Укажите название региона");
      return;
    }
    const ok = await runLogisticsAction(
      () => createRegion({ name: name.trim() }),
      "Регион добавлен",
      reload,
    );
    if (ok) {
      setOpen(false);
      setName("");
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Регионы" }]}>
      <LogisticsListPageContent
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
        emptyMessage="Пока нет регионов."
      />

      <LogisticsDialog
        open={open}
        onOpenChange={setOpen}
        title="Новый регион"
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ОАЭ" />
          </label>
          <Button type="button" onClick={() => void create()}>
            Добавить
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const RegionDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore({
    kind: "place",
    placeKind: "region",
    id: String(params.id ?? ""),
  });
  const region = snapshot.regions.find((item) => item.id === params.id);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");

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
    setEditOpen(true);
  };

  const save = async () => {
    if (!region || !name.trim()) {
      toast.error("Укажите название региона");
      return;
    }
    const ok = await runLogisticsAction(
      () => updateRegion({ id: region.id, name: name.trim() }),
      "Регион обновлён",
      reload,
    );
    if (ok) {
      setEditOpen(false);
    }
  };

  if (isLoading || error || !region) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Регионы", href: "/store/logistics/regions" }, { label: "Регион" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Регион не найден."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={[{ label: "Регионы", href: "/store/logistics/regions" }, { label: region.name }]}>
      <LogisticsToolbar
        title={region.name}
        titleMeta={<LogisticsCodeBadge code={region.code} />}
        actions={
          <Button type="button" size="sm" onClick={openEdit}>
            Изменить
          </Button>
        }
      />
      <LogisticsTableCard
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
      </LogisticsTableCard>
      <RelatedDocuments title="Резервы" href="/store/logistics/reservations" items={reservations} />
      <DocumentLedger
        snapshot={snapshot}
        filter={(entry) =>
          documentKeysForAssignedEntity(snapshot.transactions, "region", region.id).has(
            documentKey(entry.documentType, entry.documentId),
          )
        }
      />

      <LogisticsDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Регион"
      >
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Код: <LogisticsCodeBadge code={region.code} />
          </p>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Название</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ОАЭ" />
          </label>
          <Button type="button" onClick={() => void save()}>
            Сохранить
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};
