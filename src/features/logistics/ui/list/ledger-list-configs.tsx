"use client";

import { hrefForDocument, hrefForLocation, hrefForOwner } from "@/features/logistics/logistics-availability";
import {
  formatSignedQuantity,
  formatTimestamp,
  LEDGER_ASSIGNED_TO_KIND_LABELS,
  LEDGER_DOCUMENT_KIND_LABELS,
  locationKindLabel,
  signedQuantityClassName,
} from "@/features/logistics/logistics-labels";
import { documentLabel, locationIdentity, ownerLabel, productById } from "@/features/logistics/logistics-lookups";
import { isFreeOwner } from "@/features/logistics/logistics-types";
import type { LogisticsSnapshot, StockTransaction } from "@/features/logistics/logistics-types";
import { LedgerEntityIdentity } from "@/features/logistics/ui/ledger-entity-identity";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import type { ListColumnDef, ListGroupDef, ListSortDef } from "./list-types";

export const ledgerColumns = (snapshot: LogisticsSnapshot): ListColumnDef<StockTransaction>[] => [
  {
    id: "time",
    label: "Время",
    locked: true,
    sortType: "date",
    sortValue: (row) => row.createdAt,
    render: (row) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">{formatTimestamp(row.createdAt)}</span>
    ),
  },
  {
    id: "change",
    label: "Изменение",
    align: "right",
    sortType: "number",
    sortValue: (row) => row.quantity,
    render: (row) => (
      <span className={signedQuantityClassName(row.quantity)}>
        {formatSignedQuantity(row.quantity, productById(snapshot, row.productId)?.unit)}
      </span>
    ),
  },
  {
    id: "product",
    label: "Товар",
    sortType: "text",
    sortValue: (row) => productById(snapshot, row.productId)?.name ?? row.productId,
    render: (row) => <ProductIdentity snapshot={snapshot} productId={row.productId} />,
  },
  {
    id: "location",
    label: "Место",
    sortType: "text",
    sortValue: (row) => locationIdentity(snapshot, row.locationType, row.locationId).title,
    render: (row) => {
      const place = locationIdentity(snapshot, row.locationType, row.locationId);
      return (
        <LedgerEntityIdentity
          kind={locationKindLabel(row.locationType, place.isPlantWarehouse)}
          code={place.title}
          href={hrefForLocation(snapshot, row.locationType, row.locationId)}
        />
      );
    },
  },
  {
    id: "assignedTo",
    label: "Закреплено за",
    sortType: "text",
    sortValue: (row) => ownerLabel(snapshot, row.assignedToType, row.assignedToId),
    render: (row) =>
      isFreeOwner(row.assignedToType, row.assignedToId) ? (
        <LedgerEntityIdentity kind={LEDGER_ASSIGNED_TO_KIND_LABELS.free} />
      ) : (
        <LedgerEntityIdentity
          kind={LEDGER_ASSIGNED_TO_KIND_LABELS[row.assignedToType ?? "free"]}
          code={ownerLabel(snapshot, row.assignedToType, row.assignedToId)}
          href={hrefForOwner(row.assignedToType, row.assignedToId, snapshot)}
        />
      ),
  },
  {
    id: "document",
    label: "Документ",
    sortType: "text",
    sortValue: (row) => documentLabel(snapshot, row.documentType, row.documentId),
    render: (row) => (
      <LedgerEntityIdentity
        kind={LEDGER_DOCUMENT_KIND_LABELS[row.documentType]}
        code={documentLabel(snapshot, row.documentType, row.documentId)}
        href={hrefForDocument(row.documentType, row.documentId, snapshot)}
      />
    ),
  },
];

export const ledgerSortDefs: ListSortDef<StockTransaction>[] = [
  { id: "time", label: "Время", type: "date", value: (row) => row.createdAt, defaultDirection: "desc" },
  { id: "change", label: "Изменение", type: "number", value: (row) => row.quantity },
];

export const ledgerGroupDefs = (snapshot: LogisticsSnapshot): ListGroupDef<StockTransaction>[] => [
  {
    id: "document",
    label: "Документ",
    key: (row) => `${row.documentType}:${row.documentId}`,
    renderHeader: (key, rows) => {
      const row = rows[0];
      return row ? documentLabel(snapshot, row.documentType, row.documentId) : key;
    },
  },
  {
    id: "product",
    label: "Товар",
    key: (row) => row.productId,
    renderHeader: (key) => productById(snapshot, key)?.name ?? key,
  },
  {
    id: "day",
    label: "День",
    key: (row) => row.createdAt.slice(0, 10),
    renderHeader: (key) => new Date(`${key}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
  },
];
