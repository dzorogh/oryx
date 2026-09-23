// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import { ALL_VALUE } from "@/components/store/pim/products/catalog/catalog-helpers";
import { CatalogQuickSelectControl } from "@/components/store/pim/products/catalog/catalog-filters";
import { DOCUMENT_TYPE_LABELS } from "@/features/logistics/logistics-labels";
import type { DocumentType } from "@/features/logistics/logistics-types";
import { DOCUMENT_TYPES } from "@/features/logistics/logistics-types";
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

const DOCUMENT_OPTIONS = DOCUMENT_TYPES.map((id) => ({ value: id, label: DOCUMENT_TYPE_LABELS[id] }));

export const LedgerPage = () => {
  const { snapshot, isLoading, error } = useLogisticsStore({ kind: "ledger" });
  const [documentFilter, setDocumentFilter] = useState<string>(ALL_VALUE);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState(ALL_VALUE);
  const [flowFilter, setFlowFilter] = useState<"all" | "in" | "out">("all");
  const [page, setPage] = useState(1);

  const productOptions = useMemo(() => {
    const ids = [...new Set(snapshot.transactions.map((row) => row.productId))];
    return ids
      .map((id) => ({ value: id, label: snapshot.products.find((item) => item.id === id)?.name ?? id }))
      .sort((left, right) => left.label.localeCompare(right.label, "ru"));
  }, [snapshot.products, snapshot.transactions]);

  const filteredRows = useMemo(() => {
    const baseFilter = (entry: { documentType: DocumentType; productId: string; quantity: number }) => {
      if (documentFilter !== ALL_VALUE && entry.documentType !== documentFilter) return false;
      if (productFilter !== ALL_VALUE && entry.productId !== productFilter) return false;
      if (flowFilter === "in" && entry.quantity <= 0) return false;
      if (flowFilter === "out" && entry.quantity >= 0) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const product = snapshot.products.find((item) => item.id === entry.productId);
        if (!(product?.name.toLowerCase().includes(q) || entry.productId.toLowerCase().includes(q))) return false;
      }
      return true;
    };
    return documentLedgerRows(snapshot.transactions, baseFilter);
  }, [documentFilter, flowFilter, productFilter, search, snapshot.products, snapshot.transactions]);

  const pagination = paginateLedgerRows(filteredRows, page, LEDGER_PAGE_SIZE);
  const paginationItems = buildPaginationItems(pagination.visiblePage, pagination.totalPages);

  const hasActiveFilters =
    search.trim().length > 0 || productFilter !== ALL_VALUE || documentFilter !== ALL_VALUE;

  const footer =
    pagination.total > 0 ? (
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
        quickControls={
          <CatalogQuickSelectControl
            value={documentFilter}
            onValueChange={(value) => {
              setDocumentFilter(value ?? ALL_VALUE);
              setPage(1);
            }}
            ariaLabel="Фильтр по документу"
            placeholder="Документ"
            allLabel="Все документы"
            options={DOCUMENT_OPTIONS}
            widthClassName="w-[150px] shrink-0 lg:w-[176px]"
          />
        }
        search={{ value: search, onChange: (value) => { setSearch(value); setPage(1); }, placeholder: "Поиск по товару" }}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearch("");
          setProductFilter(ALL_VALUE);
          setDocumentFilter(ALL_VALUE);
          setPage(1);
        }}
        filterSheet={
          <>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Товар</span>
              <CatalogQuickSelectControl
                value={productFilter}
                onValueChange={(value) => {
                  setProductFilter(value ?? ALL_VALUE);
                  setPage(1);
                }}
                ariaLabel="Фильтр по товару"
                placeholder="Все товары"
                allLabel="Все товары"
                options={productOptions}
                widthClassName="w-full"
              />
            </label>
          </>
        }
        footer={footer}
        emptyMessage={snapshot.transactions.length === 0 ? "Журнал пуст." : "Ничего не найдено"}
      />
    </LogisticsPageShell>
  );
};
