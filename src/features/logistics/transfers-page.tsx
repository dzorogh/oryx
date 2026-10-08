// english-ui:ignore-file
"use client";

import { ArrowLeftRight, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { completeTransfer, createAndSendTransfer, loadTransferList, updateExpectedEnd } from "@/features/logistics/logistics-api";
import { formatEntityCode } from "@/lib/entity-codes";
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
import { matchesProductSearch } from "@/features/logistics/ui/list/list-helpers";
import type { ListFilterDef } from "@/features/logistics/ui/list/list-filters";
import {
  authorFilter,
  createdFilter,
  deadlineBucketFilter,
  deadlineRangeFilter,
  lineCountFilter,
  placeCodeFilter,
  productFilter,
  quantityFilter,
  statusOptions,
} from "@/features/logistics/ui/list/list-filter-defs";
import type { TransferListRow } from "@/features/logistics/logistics-list-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import {
  isTransferInTransitStatus,
  matchDocumentParam,
  type TransferStatus,
} from "@/features/logistics/logistics-types";
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
import { projectTransferDetail, transferHasMixedOwners } from "@/features/logistics/transfer-detail-projection";
import {
  freeTransferPayload,
  sentTransferLink,
} from "@/features/logistics/transfer-direct-send";
import { finishCreatedDocuments, type CreateIntent } from "@/features/logistics/ui/open-created-documents";
import { warehouseCode } from "@/features/logistics/logistics-lookups";
import { OrderMoneyTab } from "@/features/logistics/ui/order-money-tab";
import { MIXED_OWNERS_WARNING } from "@/features/logistics/customer-order-oms";

type TransferDetailPendingAction = "reserve" | "deliver" | "expected" | null;

const TRANSFER_TOGGLE = [
  { value: "all", label: "Все" },
  { value: "sent", label: "Отправлено" },
  { value: "delivered", label: "Доставлено" },
  { value: "cancelled", label: "Отменён" },
];

const isOpenTransferStatus = (status: string) => status === "draft" || status === "in_progress" || status === "sent";

const transferStatusKey = (status: string) =>
  status === "in_progress" ? "sent" : status === "done" ? "delivered" : status;

const transferFilters: ListFilterDef<TransferListRow>[] = [
  placeCodeFilter<TransferListRow>("from", "Откуда", "warehouse", (row) => row.fromWarehouseId, { quick: true }),
  placeCodeFilter<TransferListRow>("to", "Куда", "warehouse", (row) => row.toWarehouseId, { quick: true }),
  {
    kind: "multi",
    id: "route",
    label: "Маршрут",
    searchable: true,
    values: (row) => `${row.fromWarehouseId}:${row.toWarehouseId}`,
    optionLabel: (_value, row) =>
      `${formatEntityCode("warehouse", row.fromWarehouseId)} → ${formatEntityCode("warehouse", row.toWarehouseId)}`,
  },
  {
    kind: "multi",
    id: "anyWarehouse",
    label: "Склад (откуда или куда)",
    optionSort: "number",
    values: (row) => [row.fromWarehouseId, row.toWarehouseId],
    optionLabel: (value) => formatEntityCode("warehouse", value),
  },
  productFilter<TransferListRow>((row) => row.products),
  {
    kind: "multi",
    id: "status",
    label: "Статус",
    options: statusOptions(TRANSFER_STATUS_LABELS, ["draft", "sent", "delivered", "cancelled"]),
    values: (row) => transferStatusKey(row.status),
  },
  deadlineBucketFilter<TransferListRow>(isOpenTransferStatus),
  deadlineRangeFilter<TransferListRow>(),
  createdFilter<TransferListRow>(),
  authorFilter<TransferListRow>(),
  quantityFilter<TransferListRow>((row) => row.products),
  lineCountFilter<TransferListRow>((row) => row.products),
];

export const TransfersPage = () => {
  const router = useRouter();
  const { rows: listRows, isLoading, error, reload } = useLogisticsList(loadTransferList);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const formStore = useLogisticsStore({ kind: "form", form: "transfer", enabled: open });
  const snapshot = formStore.snapshot;

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
        return true;
      }),
    [listRows, search, status],
  );

  const create = async (
    value: {
      fromWarehouseId: string;
      toWarehouseId: string;
      expectedEndOn: string | null;
      lines: Array<{
        productId: string;
        quantity: number;
        ownerType?: import("@/features/logistics/logistics-types").OwnerType | null;
        ownerId?: string | null;
      }>;
    },
    intent: CreateIntent,
  ) => {
    const created = await createAndSendTransfer(
      freeTransferPayload({
        fromWarehouseId: value.fromWarehouseId,
        toWarehouseId: value.toWarehouseId,
        expectedEndOn: value.expectedEndOn,
        lines: value.lines,
      }),
    );
    await finishCreatedDocuments({
      intent,
      navigate: (href) => router.push(href),
      main: sentTransferLink(created),
      message: "Перемещение создано",
      refresh: reload,
    });
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
        filters={transferFilters}
        hasActiveFilters={search.trim().length > 0}
        onResetFilters={() => setSearch("")}
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
  const { snapshot, balances, orderMoney, isLoading, isRefreshing, error, reload } = useLogisticsStore({
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
      <div className="flex flex-col gap-3" aria-busy={pendingAction != null || isRefreshing}>
        <DocumentHeader
          kind="Перемещение"
          icon={ArrowLeftRight}
          number={doc.number}
          status={<TransferStatusBadge status={doc.status} />}
          description={
            transferHasMixedOwners(projection) ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                <TriangleAlert className="size-3.5" aria-hidden />
                {MIXED_OWNERS_WARNING}
              </span>
            ) : null
          }
          actions={
            <>
              {projection.canReserveInTransit ? (
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
              {isTransferInTransitStatus(doc.status) ? (
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
              id: "money",
              label: "Деньги",
              count: orderMoney.payments.length,
              panel: (
                <OrderMoneyTab
                  variant="transfer"
                  snapshot={snapshot}
                  documentId={doc.id}
                  context={orderMoney}
                  reload={reload}
                />
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
        onSubmit={async (value, intent) => {
          const created = await createAndSendTransfer(
            freeTransferPayload({
              fromWarehouseId: value.fromWarehouseId,
              toWarehouseId: value.toWarehouseId,
              expectedEndOn: value.expectedEndOn,
              lines: value.lines,
            }),
          );
          await finishCreatedDocuments({
            intent,
            navigate: (href) => router.push(href),
            main: sentTransferLink(created),
            message: "Обратное перемещение создано",
            refresh: reload,
          });
          return true;
        }}
      />
    </LogisticsPageShell>
  );
};
