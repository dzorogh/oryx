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
  { id: "all", label: "All documents" },
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
    <LogisticsPageShell crumbs={[{ label: "Ledger" }]}>
      <LogisticsToolbar
        title="Ledger"
        description="Immutable stock facts. Posted warehouse documents are not reversed; correct them with a new document."
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Document class">
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
          <p className="text-sm text-muted-foreground">The ledger is empty.</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stock facts match this document class.</p>
        ) : (
          <DocumentLedger snapshot={snapshot} filter={filter} title="Stock facts" />
        )
      ) : null}
    </LogisticsPageShell>
  );
};
