// english-ui:ignore-file
"use client";

import { ArrowLeftRight } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ALL_VALUE } from "@/components/store/pim/products/catalog/catalog-helpers";
import { CatalogQuickSelectControl } from "@/components/store/pim/products/catalog/catalog-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { completeTransfer, createAndSendTransfer, loadTransferList, updateExpectedEnd } from "@/features/logistics/logistics-api";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { projectDocumentCancelGuidance } from "@/features/logistics/logistics-cancel-guidance";
import { DocumentCancelControl } from "@/features/logistics/ui/document-cancel-guidance";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { buildDocumentTimeline, documentCompletedAt } from "@/features/logistics/document-timeline";
import { hrefForTransfer, hrefForWarehouse } from "@/features/logistics/logistics-availability";
import { ReservationCatalogDialog } from "@/features/logistics/ui/reservation-catalog-dialog";
import {
  formatExpectedEnd,
  formatMetaTimestamp,
  TRANSFER_STATUS_LABELS,
} from "@/features/logistics/logistics-labels";
import { LOGISTICS_PATHS } from "@/features/logistics/logistics-paths";
import {
  transferColumns,
  transferGroupDefs,
  transferSortDefs,
} from "@/features/logistics/ui/list/document-list-configs";
import { LogisticsListPageContent } from "@/features/logistics/ui/list/logistics-list-page-content";
import { deadlineFilterMatch, matchesProductSearch } from "@/features/logistics/ui/list/list-helpers";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import { matchDocumentParam, type TransferStatus } from "@/features/logistics/logistics-types";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { TransferCreateDialog } from "@/features/logistics/ui/transfer-create-dialog";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { StatusPill, TransferStatusBadge } from "@/features/logistics/ui/status-badge";
import { DocumentHeader } from "@/features/logistics/ui/document/document-header";
import { DocumentHistory } from "@/features/logistics/ui/document/document-history";
import { DocumentMetaDateInput, DocumentMetaEmpty, overdueDays } from "@/features/logistics/ui/document/document-meta-field";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { DocumentTabs } from "@/features/logistics/ui/document/document-tabs";
import { TransferProductManifest } from "@/features/logistics/ui/transfer-product-manifest";
import { useLogisticsList, useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { projectTransferDetail } from "@/features/logistics/transfer-detail-projection";
import {
  freeTransferPayload,
  openSentTransfer,
} from "@/features/logistics/transfer-direct-send";
import { warehouseCode } from "@/features/logistics/logistics-lookups";

type TransferDetailPendingAction = "reserve" | "deliver" | "expected" | null;

const TRANSFER_TOGGLE = [
  { value: "all", label: "Все" },
  { value: "sent", label: "Отправлено" },
  { value: "delivered", label: "Доставлено" },
  { value: "cancelled", label: "Отменён" },
];

export const TransfersPage = () => {
  const router = useRouter();
  const { rows: listRows, isLoading, error, reload } = useLogisticsList(loadTransferList);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [fromFilter, setFromFilter] = useState(ALL_VALUE);
  const [toFilter, setToFilter] = useState(ALL_VALUE);
  const [deadlineFilter, setDeadlineFilter] = useState<"all" | "overdue" | "week" | "none">("all");
  const [open, setOpen] = useState(false);
  const formStore = useLogisticsStore({ kind: "form", form: "transfer", enabled: open });
  const snapshot = formStore.snapshot;

  const warehouseOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const row of listRows) {
      ids.add(row.fromWarehouseId);
      ids.add(row.toWarehouseId);
    }
    return [...ids]
      .sort((left, right) => Number(left) - Number(right))
      .map((id) => ({ value: id, label: formatLogisticsCode("warehouse", id) }));
  }, [listRows]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    fromFilter !== ALL_VALUE ||
    toFilter !== ALL_VALUE ||
    deadlineFilter !== "all";

  const rows = useMemo(
    () =>
      listRows.filter((item) => {
        if (status !== "all") {
          if (status === "sent" && item.status !== "sent" && item.status !== "in_progress") return false;
          if (status === "delivered" && item.status !== "delivered" && item.status !== "done") return false;
          if (status !== "sent" && status !== "delivered" && item.status !== status) return false;
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (!item.number.toLowerCase().includes(q) && !matchesProductSearch(item.products, q)) return false;
        }
        if (fromFilter !== ALL_VALUE && item.fromWarehouseId !== fromFilter) return false;
        if (toFilter !== ALL_VALUE && item.toWarehouseId !== toFilter) return false;
        if (
          !deadlineFilterMatch(
            item.expectedEndOn,
            deadlineFilter,
            item.status === "draft" || item.status === "in_progress" || item.status === "sent",
          )
        ) {
          return false;
        }
        return true;
      }),
    [deadlineFilter, fromFilter, listRows, search, status, toFilter],
  );

  const create = async (value: {
    fromWarehouseId: string;
    toWarehouseId: string;
    expectedEndOn: string | null;
    lines: Array<{
      productId: string;
      quantity: number;
      ownerType?: import("@/features/logistics/logistics-types").OwnerType | null;
      ownerId?: string | null;
    }>;
  }) => {
    const created = await createAndSendTransfer(
      freeTransferPayload({
        fromWarehouseId: value.fromWarehouseId,
        toWarehouseId: value.toWarehouseId,
        expectedEndOn: value.expectedEndOn,
        lines: value.lines,
      }),
    );
    await reload();
    openSentTransfer(created, (href) => router.push(href));
    return true;
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Перемещения" }]}>
      <LogisticsListPageContent
        listId="transfers"
        title="Перемещения"
        actionLabel="Новое перемещение"
        onAction={() => setOpen(true)}
        columns={transferColumns}
        sortDefs={transferSortDefs}
        groupDefs={transferGroupDefs()}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        toggleOptions={TRANSFER_TOGGLE}
        toggleValue={status}
        onToggleChange={setStatus}
        toggleAriaLabel="Статус перемещения"
        search={{ value: search, onChange: setSearch }}
        quickControls={
          <>
            <CatalogQuickSelectControl
              value={fromFilter}
              onValueChange={(value) => setFromFilter(value ?? ALL_VALUE)}
              ariaLabel="Быстрый фильтр: откуда"
              placeholder="Откуда"
              allLabel="Любой склад"
              options={warehouseOptions}
              widthClassName="w-[120px] shrink-0 lg:w-[140px]"
            />
            <CatalogQuickSelectControl
              value={toFilter}
              onValueChange={(value) => setToFilter(value ?? ALL_VALUE)}
              ariaLabel="Быстрый фильтр: куда"
              placeholder="Куда"
              allLabel="Любой склад"
              options={warehouseOptions}
              widthClassName="w-[120px] shrink-0 lg:w-[140px]"
            />
          </>
        }
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearch("");
          setFromFilter(ALL_VALUE);
          setToFilter(ALL_VALUE);
          setDeadlineFilter("all");
        }}
        filterSheet={
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Срок</span>
            <CatalogQuickSelectControl
              value={deadlineFilter}
              onValueChange={(value) => setDeadlineFilter((value ?? "all") as typeof deadlineFilter)}
              ariaLabel="Фильтр по сроку"
              placeholder="Любой срок"
              allLabel="Любой срок"
              options={[
                { value: "overdue", label: "Просрочен" },
                { value: "week", label: "Ближайшие 7 дней" },
                { value: "none", label: "Без срока" },
              ]}
              widthClassName="w-full"
            />
          </label>
        }
      />

      <TransferCreateDialog
        open={open}
        onOpenChange={setOpen}
        snapshot={formStore.snapshot}
        balances={formStore.balances}
        loading={formStore.isLoading}
        loadError={formStore.error}
        context={{ kind: "free" }}
        onSubmit={create}
      />
    </LogisticsPageShell>
  );
};

const transferCrumbs = (label: string) => [
  { label: "Перемещения", href: LOGISTICS_PATHS.transfers },
  { label },
];

const TransferDetailSkeleton = () => (
  <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
    <p className="sr-only">Загрузка перемещения…</p>
    <div className="rounded-lg border border-border bg-card p-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-4 h-16 w-full" />
    </div>
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="rounded-lg border border-border bg-card p-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-40 w-full" />
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-3 h-40 w-full" />
      </div>
    </div>
  </div>
);

export const TransferDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore({
    kind: "document",
    documentKind: "transfer",
    ref: String(params.id ?? ""),
  });
  const doc = matchDocumentParam(snapshot.transfers, params.id);
  const projection = useMemo(
    () => (doc ? projectTransferDetail(snapshot, balances, doc) : null),
    [balances, doc, snapshot],
  );
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<TransferDetailPendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const cancelGuidance = doc
    ? projectDocumentCancelGuidance({ type: "transfer", id: doc.id }, snapshot, balances)
    : null;

  const runDetailAction = async (key: Exclude<TransferDetailPendingAction, null>, action: () => Promise<unknown>, success: string) => {
    if (pendingAction) {
      return;
    }
    setPendingAction(key);
    setActionError(null);
    const ok = await runLogisticsAction(action, success, reload);
    if (!ok) {
      setActionError("Действие не удалось выполнить.");
    }
    setPendingAction(null);
  };

  if (isLoading && !doc && !error) {
    return (
      <LogisticsPageShell crumbs={transferCrumbs("Перемещение")}>
        <TransferDetailSkeleton />
      </LogisticsPageShell>
    );
  }

  if (error && (!doc || !isLoading)) {
    return (
      <LogisticsPageShell crumbs={transferCrumbs("Перемещение")}>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm">Не удалось загрузить перемещение.</p>
          <Button type="button" size="sm" className="mt-3 h-11 min-w-11 md:h-8" onClick={() => void reload()}>
            Повторить
          </Button>
        </div>
      </LogisticsPageShell>
    );
  }

  if (!doc || !projection) {
    return (
      <LogisticsPageShell crumbs={transferCrumbs("Перемещение")}>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm">Перемещение не найдено.</p>
          <Link href={LOGISTICS_PATHS.transfers} className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
            К перемещениям
          </Link>
        </div>
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={transferCrumbs(doc.number)}>
      <div className="flex flex-col gap-3" aria-busy={pendingAction != null || isLoading}>
        <DocumentHeader
          kind="Перемещение"
          icon={ArrowLeftRight}
          number={doc.number}
          status={<TransferStatusBadge status={doc.status} />}
          actions={
            <>
              {doc.status === "sent" && projection.canReserveInTransit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pendingAction != null}
                  aria-busy={pendingAction === "reserve"}
                  onClick={() => setReserveOpen(true)}
                >
                  Зарезервировать в пути
                </Button>
              ) : null}
              {doc.status === "sent" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={pendingAction != null}
                  aria-busy={pendingAction === "deliver"}
                  onClick={() => {
                    void runDetailAction("deliver", () => completeTransfer(doc.id), "Перемещение отмечено доставленным");
                  }}
                >
                  Отметить доставленным
                </Button>
              ) : null}
              {cancelGuidance ? (
                <DocumentCancelControl
                  guidance={cancelGuidance}
                  kicker={doc.number}
                  reload={reload}
                  onFollowUp={(action) => {
                    if (action.id === "mark-delivered") {
                      void runDetailAction("deliver", () => completeTransfer(doc.id), "Перемещение отмечено доставленным");
                    }
                    if (action.id === "open-reverse-transfer") {
                      setReverseOpen(true);
                    }
                  }}
                />
              ) : null}
            </>
          }
          meta={[
            {
              label: "Откуда",
              value: <LogisticsCodeBadge code={warehouseCode(snapshot, doc.fromWarehouseId)} href={hrefForWarehouse(doc.fromWarehouseId)} />,
            },
            {
              label: "Куда",
              value: <LogisticsCodeBadge code={warehouseCode(snapshot, doc.toWarehouseId)} href={hrefForWarehouse(doc.toWarehouseId)} />,
            },
            {
              label: "Сейчас",
              value:
                projection.route.currentKind === "transfer" ? (
                  <span>
                    в пути <LogisticsCodeBadge code={doc.number} />
                  </span>
                ) : projection.route.currentKind === "destination" ? (
                  <span>
                    на складе{" "}
                    <LogisticsCodeBadge
                      code={warehouseCode(snapshot, doc.toWarehouseId)}
                      href={hrefForWarehouse(doc.toWarehouseId)}
                    />
                  </span>
                ) : (
                  <span>
                    на складе{" "}
                    <LogisticsCodeBadge
                      code={warehouseCode(snapshot, doc.fromWarehouseId)}
                      href={hrefForWarehouse(doc.fromWarehouseId)}
                    />
                  </span>
                ),
            },
            {
              label: "Ожидалось",
              value: (
                <DocumentMetaDateInput
                  value={doc.expectedEndOn ?? ""}
                  aria-label="Ожидалось"
                  overdueDays={
                    doc.status !== "done" && doc.status !== "delivered" && doc.status !== "cancelled"
                      ? overdueDays(doc.expectedEndOn)
                      : 0
                  }
                  onChange={(value) => {
                    void runDetailAction(
                      "expected",
                      () => updateExpectedEnd(doc.id, value || null),
                      "Дата обновлена",
                    );
                  }}
                />
              ),
            },
            {
              label: "Отправлено",
              value: formatMetaTimestamp(doc.createdAt),
            },
            {
              label: "Доставлено",
              value: documentCompletedAt(snapshot, doc.id)
                ? formatMetaTimestamp(documentCompletedAt(snapshot, doc.id))
                : <DocumentMetaEmpty />,
            },
          ]}
        />

        <DocumentTabs
          tabs={[
            {
              id: "products",
              label: "Товары и резервы",
              count: projection.products.length,
              panel: (
                <DocumentSection title="Товары и резервы">
                  <TransferProductManifest
                    bare
                    snapshot={snapshot}
                    groups={projection.groups}
                    products={projection.products}
                  />
                </DocumentSection>
              ),
            },
            {
              id: "movements",
              label: "Движения",
              count: snapshot.transactions.filter(
                (entry) => entry.documentType === "transfer" && entry.documentId === doc.id,
              ).length,
              panel: (
                <DocumentSection title="Движения">
                  <DocumentLedger
                    bare
                    snapshot={snapshot}
                    hide="document"
                    filter={(entry) => entry.documentType === "transfer" && entry.documentId === doc.id}
                  />
                </DocumentSection>
              ),
            },
            {
              id: "history",
              label: "История",
              count: buildDocumentTimeline(snapshot, {
                documentId: doc.id,
                createdAt: doc.createdAt,
                createdBy: doc.createdBy,
                statusLabels: TRANSFER_STATUS_LABELS,
              }).length,
              panel: (
                <DocumentHistory
                  entries={buildDocumentTimeline(snapshot, {
                    documentId: doc.id,
                    createdAt: doc.createdAt,
                    createdBy: doc.createdBy,
                    statusLabels: TRANSFER_STATUS_LABELS,
                  })}
                  renderStatus={(statusKey) => (
                    <StatusPill status={statusKey} label={TRANSFER_STATUS_LABELS[statusKey as TransferStatus]} />
                  )}
                />
              ),
            },
          ]}
        />
        <div role="status" aria-live="polite" className="sr-only">
          {pendingAction != null ? "Выполняется…" : null}
          {actionError}
        </div>
      </div>
      <ReservationCatalogDialog
        snapshot={snapshot}
        balances={balances}
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        preset={{ locationType: "transfer", locationId: doc.id, direction: "reserve" }}
      />
      <TransferCreateDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        snapshot={snapshot}
        balances={balances}
        context={{ kind: "free" }}
        preset={cancelGuidance?.transferPreset}
        onSubmit={async (value) => {
          const created = await createAndSendTransfer(
            freeTransferPayload({
              fromWarehouseId: value.fromWarehouseId,
              toWarehouseId: value.toWarehouseId,
              expectedEndOn: value.expectedEndOn,
              lines: value.lines,
            }),
          );
          await reload();
          openSentTransfer(created, (href) => router.push(href));
          return true;
        }}
      />
    </LogisticsPageShell>
  );
};
