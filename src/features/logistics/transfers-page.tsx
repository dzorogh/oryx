// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { completeTransfer, createAndSendTransfer, updateExpectedEnd } from "@/features/logistics/logistics-api";
import { projectDocumentCancelGuidance } from "@/features/logistics/logistics-cancel-guidance";
import { DocumentCancelControl } from "@/features/logistics/ui/document-cancel-guidance";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { hrefForTransfer } from "@/features/logistics/logistics-availability";
import { ReservationForm } from "@/features/logistics/logistics-forms";
import { formatExpectedEnd } from "@/features/logistics/logistics-labels";
import { DocumentProductLines } from "@/features/logistics/ui/document-product-lines";
import { LOGISTICS_PATHS } from "@/features/logistics/logistics-paths";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import type { TransferStatus } from "@/features/logistics/logistics-types";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { TransferCreateDialog } from "@/features/logistics/ui/transfer-create-dialog";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { TransferStatusBadge } from "@/features/logistics/ui/status-badge";
import { TransferActivity } from "@/features/logistics/ui/transfer-activity";
import { TransferDetailHeader, type TransferDetailPendingAction } from "@/features/logistics/ui/transfer-detail-header";
import { TransferProductManifest } from "@/features/logistics/ui/transfer-product-manifest";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { projectTransferDetail } from "@/features/logistics/transfer-detail-projection";
import {
  freeTransferPayload,
  newTransferRequestKey,
  openSentTransfer,
} from "@/features/logistics/transfer-direct-send";

const STATUS_FILTERS: Array<{ id: "all" | TransferStatus; label: string }> = [
  { id: "all", label: "Все" },
  { id: "sent", label: "Отправлено" },
  { id: "delivered", label: "Доставлено" },
  { id: "cancelled", label: "Отменён" },
];

export const TransfersPage = () => {
  const router = useRouter();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const [requestKey, setRequestKey] = useState(newTransferRequestKey);

  const rows = snapshot.transfers.filter((item) => status === "all" || item.status === status);

  const create = async (value: {
    fromWarehouseId: string;
    toWarehouseId: string;
    expectedEndOn: string | null;
    lines: Array<{ productId: string; quantity: number }>;
  }) => {
    const ok = await runLogisticsAction(
      async () => {
        const created = await createAndSendTransfer(
          freeTransferPayload({
            requestKey,
            fromWarehouseId: value.fromWarehouseId,
            toWarehouseId: value.toWarehouseId,
            expectedEndOn: value.expectedEndOn,
            lines: value.lines,
          }),
        );
        openSentTransfer(created, (href) => router.push(href));
      },
      "Перемещение отправлено",
      reload,
    );
    if (ok) {
      setRequestKey(newTransferRequestKey());
    }
    return ok;
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Перемещения" }]}>
      <LogisticsToolbar
        title="Перемещения"
        actionLabel="Новое перемещение"
        onAction={() => setOpen(true)}
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Статус перемещения">
          {STATUS_FILTERS.map((item) => (
            <HomeFilterChip
              key={item.id}
              active={status === item.id}
              role="tab"
              aria-selected={status === item.id}
              onClick={() => setStatus(item.id)}
            >
              {item.label}
            </HomeFilterChip>
          ))}
        </div>
      </LogisticsToolbar>
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Номер", "Откуда", "Куда", "Товары", "Статус", "Ожидаемое окончание"]} isEmpty={rows.length === 0}>
          {rows.map((item) => {
            const itemLines = snapshot.transferLines.filter((line) => line.transferId === item.id);
            return (
              <TableRow key={item.id}>
                <TableCell className="px-3 py-2 align-top">
                  <LogisticsCodeBadge code={item.number} href={hrefForTransfer(item.id)} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top text-sm">
                  <WarehouseLink snapshot={snapshot} warehouseId={item.fromWarehouseId} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top text-sm">
                  <WarehouseLink snapshot={snapshot} warehouseId={item.toWarehouseId} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <DocumentProductLines snapshot={snapshot} lines={itemLines} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <TransferStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top text-sm tabular-nums">
                  {formatExpectedEnd(item.expectedEndOn)}
                </TableCell>
              </TableRow>
            );
          })}
        </LogisticsTableCard>
      ) : null}

      <TransferCreateDialog
        open={open}
        onOpenChange={setOpen}
        snapshot={snapshot}
        balances={balances}
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
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const doc = snapshot.transfers.find((item) => item.id === params.id);
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
        <TransferDetailHeader
          snapshot={snapshot}
          transfer={doc}
          route={projection.route}
          canReserveInTransit={projection.canReserveInTransit}
          pendingAction={pendingAction}
          actionError={actionError}
          extraActions={
            cancelGuidance ? (
              <DocumentCancelControl
                guidance={cancelGuidance}
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
            ) : null
          }
          onReserveInTransit={() => setReserveOpen(true)}
          onMarkDelivered={() => {
            void runDetailAction("deliver", () => completeTransfer(doc.id), "Перемещение отмечено доставленным");
          }}
          onExpectedEndChange={(value) => {
            void runDetailAction(
              "expected",
              () => updateExpectedEnd("store_transfer", doc.id, value || null),
              "Дата обновлена",
            );
          }}
        />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <TransferProductManifest snapshot={snapshot} groups={projection.groups} products={projection.products} />
          <TransferActivity events={projection.activity} />
        </div>
        <DocumentLedger
          snapshot={snapshot}
          hide="document"
          filter={(entry) => entry.documentType === "transfer" && entry.documentId === doc.id}
        />
      </div>
      <ReservationForm
        snapshot={snapshot}
        balances={balances}
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        reload={reload}
        preset={{ locationType: "transfer", locationId: doc.id }}
      />
      <TransferCreateDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        snapshot={snapshot}
        balances={balances}
        context={{ kind: "free" }}
        preset={cancelGuidance?.transferPreset}
        onSubmit={async (value) => {
          const ok = await runLogisticsAction(
            () =>
              createAndSendTransfer(
                freeTransferPayload({
                  requestKey: newTransferRequestKey(),
                  fromWarehouseId: value.fromWarehouseId,
                  toWarehouseId: value.toWarehouseId,
                  expectedEndOn: value.expectedEndOn,
                  lines: value.lines,
                }),
              ),
            "Обратное перемещение отправлено",
            reload,
          );
          return ok;
        }}
      />
    </LogisticsPageShell>
  );
};
