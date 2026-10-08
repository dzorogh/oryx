// english-ui:ignore-file
"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ASSIGNED_TO_LABEL,
  DOCUMENT_TYPE_LABELS,
  LEDGER_ASSIGNED_TO_KIND_LABELS,
  STOCK_STATE_LABELS,
  locationKindLabel,
} from "@/features/logistics/logistics-labels";
import { documentLabel, locationIdentity, ownerLabel, productById } from "@/features/logistics/logistics-lookups";
import {
  DOCUMENT_TYPES,
  STOCK_STATES,
  isFreeOwner,
  isOutputDocumentKind,
  type DocumentType,
  type LocationType,
  type LogisticsSnapshot,
  type StockTransaction,
} from "@/features/logistics/logistics-types";
import type { ListFilterDef } from "@/features/logistics/ui/list/list-filters";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import {
  LEDGER_PAGE_SIZE,
  documentLedgerRows,
  paginateLedgerRows,
} from "@/features/logistics/ui/document-ledger";
import {
  ledgerColumns,
  ledgerGroupDefs,
  ledgerSortDefs,
} from "@/features/logistics/ui/list/ledger-list-configs";
import { LogisticsListPageContent } from "@/features/logistics/ui/list/logistics-list-page-content";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { buildPaginationItems } from "@/lib/pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const FLOW_TOGGLE = [
  { value: "all", label: "Все" },
  { value: "in", label: "Приход" },
  { value: "out", label: "Расход" },
];

const documentKindKey = (kind: DocumentType): DocumentType => (isOutputDocumentKind(kind) ? "production_output" : kind);

const DOCUMENT_KIND_OPTIONS = DOCUMENT_TYPES.filter((id) => id !== "output").map((id) => ({
  value: id,
  label: DOCUMENT_TYPE_LABELS[id],
}));

const ownerKey = (row: StockTransaction) =>
  isFreeOwner(row.assignedToType, row.assignedToId) ? "free" : `${row.assignedToType}:${row.assignedToId}`;

const ledgerFilters = (snapshot: LogisticsSnapshot): ListFilterDef<StockTransaction>[] => [
  {
    kind: "multi",
    id: "documentKind",
    label: "Документ",
    placeholder: "Документ",
    quick: true,
    options: DOCUMENT_KIND_OPTIONS,
    values: (row) => documentKindKey(row.documentType),
  },
  {
    kind: "multi",
    id: "product",
    label: "Товар",
    placeholder: "Товар",
    quick: true,
    searchable: true,
    values: (row) => row.productId,
    optionLabel: (value) => productById(snapshot, value)?.name ?? value,
  },
  {
    kind: "multi",
    id: "document",
    label: "Номер документа",
    searchable: true,
    values: (row) => `${row.documentType}:${row.documentId}`,
    optionLabel: (_value, row) => documentLabel(snapshot, row.documentType, row.documentId),
  },
  {
    kind: "multi",
    id: "location",
    label: "Место",
    searchable: true,
    values: (row) => `${row.locationType}:${row.locationId}`,
    optionLabel: (_value, row) => locationIdentity(snapshot, row.locationType, row.locationId).title,
  },
  {
    kind: "multi",
    id: "locationKind",
    label: "Тип места",
    values: (row) => {
      const place = locationIdentity(snapshot, row.locationType, row.locationId);
      return row.locationType === "warehouse" && place.isPlantWarehouse ? "plant_warehouse" : row.locationType;
    },
    optionLabel: (value) =>
      value === "plant_warehouse" ? locationKindLabel("warehouse", true) : locationKindLabel(value as LocationType),
  },
  {
    kind: "multi",
    id: "assignedTo",
    label: ASSIGNED_TO_LABEL,
    searchable: true,
    options: [{ value: "free", label: LEDGER_ASSIGNED_TO_KIND_LABELS.free }],
    values: ownerKey,
    optionLabel: (_value, row) => ownerLabel(snapshot, row.assignedToType, row.assignedToId),
  },
  {
    kind: "multi",
    id: "assignedToKind",
    label: `${ASSIGNED_TO_LABEL}: тип`,
    options: (["free", "order", "region"] as const).map((value) => ({
      value,
      label: LEDGER_ASSIGNED_TO_KIND_LABELS[value],
    })),
    values: (row) =>
      isFreeOwner(row.assignedToType, row.assignedToId) || !row.assignedToType ? "free" : row.assignedToType,
  },
  {
    kind: "multi",
    id: "stockState",
    label: "Состояние",
    options: STOCK_STATES.map((value) => ({ value, label: STOCK_STATE_LABELS[value] })),
    values: (row) => row.stockState,
  },
  { kind: "dateRange", id: "time", label: "Дата", value: (row) => row.createdAt },
  { kind: "numberRange", id: "change", label: "Изменение", unit: "шт", signed: true, value: (row) => row.quantity },
];

export const LedgerPage = () => {
  const { snapshot, isLoading, error } = useLogisticsStore({ kind: "ledger" });
  const [search, setSearch] = useState("");
  const [flowFilter, setFlowFilter] = useState<"all" | "in" | "out">("all");
  const [page, setPage] = useState(1);
  const filters = useMemo(() => ledgerFilters(snapshot), [snapshot]);
  const resetPage = useCallback(() => setPage(1), []);

  const filteredRows = useMemo(() => {
    const baseFilter = (entry: StockTransaction) => {
      if (flowFilter === "in" && entry.quantity <= 0) return false;
      if (flowFilter === "out" && entry.quantity >= 0) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const product = snapshot.products.find((item) => item.id === entry.productId);
        if (
          !(product?.name.toLowerCase().includes(q) || entry.productId.toLowerCase().includes(q)) &&
          !documentLabel(snapshot, entry.documentType, entry.documentId).toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    };
    return documentLedgerRows(snapshot.transactions, baseFilter);
  }, [flowFilter, search, snapshot]);

  const footer = (rows: StockTransaction[]) => {
    const pagination = paginateLedgerRows(rows, page, LEDGER_PAGE_SIZE);
    const paginationItems = buildPaginationItems(pagination.visiblePage, pagination.totalPages);
    return pagination.total > 0 ? (
      <div className="flex flex-col gap-3 border-t border-border/60 px-3 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">
          Показано {pagination.shownCount} из {pagination.total}
        </span>
        {pagination.totalPages > 1 ? (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Назад"
                  aria-disabled={pagination.visiblePage <= 1}
                  className={pagination.visiblePage <= 1 ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((current) => Math.max(1, current - 1));
                  }}
                />
              </PaginationItem>
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <span className="px-2 text-muted-foreground">…</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href="#"
                      isActive={item === pagination.visiblePage}
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(item);
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Вперёд"
                  aria-disabled={pagination.visiblePage >= pagination.totalPages}
                  className={
                    pagination.visiblePage >= pagination.totalPages ? "pointer-events-none opacity-50" : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((current) => Math.min(pagination.totalPages, current + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </div>
    ) : null;
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Журнал" }]}>
      <LogisticsListPageContent
        listId="ledger"
        title="Журнал"
        columns={ledgerColumns(snapshot)}
        sortDefs={ledgerSortDefs}
        groupDefs={ledgerGroupDefs(snapshot)}
        rows={filteredRows}
        paginate={(sorted) => paginateLedgerRows(sorted, page, LEDGER_PAGE_SIZE).pageRows}
        rowKey={(row) => row.id}
        groupQuantity={null}
        groupUnitLabel="движ."
        isLoading={isLoading}
        error={error}
        toggleOptions={FLOW_TOGGLE}
        toggleValue={flowFilter}
        onToggleChange={(value) => {
          setFlowFilter(value as typeof flowFilter);
          setPage(1);
        }}
        toggleAriaLabel="Приход или расход"
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Поиск: товар, документ",
        }}
        filters={filters}
        onFiltersChange={resetPage}
        hasActiveFilters={search.trim().length > 0}
        onResetFilters={() => {
          setSearch("");
          setPage(1);
        }}
        footer={footer}
        emptyMessage={snapshot.transactions.length === 0 ? "Журнал пуст." : "Ничего не найдено"}
      />
    </LogisticsPageShell>
  );
};
