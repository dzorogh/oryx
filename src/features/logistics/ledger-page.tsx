// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { DOCUMENT_TYPE_LABELS } from "@/features/logistics/logistics-labels";
import type { DocumentType } from "@/features/logistics/logistics-types";
import { DOCUMENT_TYPES } from "@/features/logistics/logistics-types";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { DocumentLedger, documentLedgerRows } from "@/features/logistics/ui/document-ledger";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const DOCUMENT_FILTERS: Array<{ id: "all" | DocumentType; label: string }> = [
  { id: "all", label: "Все документы" },
  ...DOCUMENT_TYPES.map((id) => ({
    id,
    label: DOCUMENT_TYPE_LABELS[id],
  })),
];

export const LedgerPage = () => {
  const { snapshot, isLoading, error } = useLogisticsStore();
  const [documentFilter, setDocumentFilter] = useState<(typeof DOCUMENT_FILTERS)[number]["id"]>("all");

  const filter = useMemo(
    () => (entry: { documentType: DocumentType }) =>
      documentFilter === "all" || entry.documentType === documentFilter,
    [documentFilter],
  );
  const filteredRows = useMemo(
    () => documentLedgerRows(snapshot.transactions, filter),
    [filter, snapshot.transactions],
  );

  return (
    <LogisticsPageShell crumbs={[{ label: "Журнал" }]}>
      <LogisticsToolbar
        title="Журнал"
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Класс документа">
          {DOCUMENT_FILTERS.map((item) => (
            <HomeFilterChip
              key={item.id}
              active={documentFilter === item.id}
              role="tab"
              aria-selected={documentFilter === item.id}
              onClick={() => setDocumentFilter(item.id)}
            >
              {item.label}
            </HomeFilterChip>
          ))}
        </div>
      </LogisticsToolbar>

      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}

      {!isLoading && !error ? (
        snapshot.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Журнал пуст.</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет фактов по этому классу документов.</p>
        ) : (
          <DocumentLedger snapshot={snapshot} filter={filter} title="Факты" />
        )
      ) : null}
    </LogisticsPageShell>
  );
};
