"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { getBalanceQuantity } from "@/features/logistics/logistics-balances";
import { addReservationLine, postReservation } from "@/features/logistics/logistics-api";
import { projectDocumentCancelGuidance } from "@/features/logistics/logistics-cancel-guidance";
import { DocumentCancelControl } from "@/features/logistics/ui/document-cancel-guidance";
import { hrefForOwner, reservationCapForOwner } from "@/features/logistics/logistics-availability";
import { emptyReservationLine, ReservationForm, ReservationLineFields } from "@/features/logistics/logistics-forms";
import { FREE_OWNER_LABEL, RESERVATION_DIRECTION_LABELS, formatQuantity } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById } from "@/features/logistics/logistics-lookups";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { HOLD_STATUS_FILTERS, ReservationHoldTable } from "@/features/logistics/ui/reservation-hold-list";
import { assertCustomerCapacity, assertEnoughStock } from "@/features/logistics/logistics-rules";
import {
  isFreeOwner,
  orderLineForProduct,
  reservationDirection,
  type OwnerType,
  type ReservationDirection,
  type ReservationStatus,
} from "@/features/logistics/logistics-types";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { isAllowedQuantity } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { RelatedDocuments } from "@/features/logistics/ui/related-documents";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { DocumentStatusBadge } from "@/features/logistics/ui/status-badge";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const DIRECTION_FILTERS: Array<{ id: "all" | ReservationDirection; label: string }> = [
  { id: "all", label: "Все" },
  { id: "reserve", label: RESERVATION_DIRECTION_LABELS.reserve },
  { id: "release", label: RESERVATION_DIRECTION_LABELS.release },
  { id: "reassign", label: RESERVATION_DIRECTION_LABELS.reassign },
];

const STATUS_FILTERS = HOLD_STATUS_FILTERS.filter((item) => item.id !== "cancelled");

const parseDirectionFilter = (value: string | null): "all" | ReservationDirection =>
  value === "reserve" || value === "release" || value === "reassign" ? value : "all";

export const ReservationsPage = () => {
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const searchParams = useSearchParams();
  const [direction, setDirection] = useState<"all" | ReservationDirection>(
    parseDirectionFilter(searchParams.get("operation")),
  );
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const rows = snapshot.reservations.filter((item) => {
    const lines = snapshot.reservationLines.filter((line) => line.reservationId === item.id);
    const itemDirection = reservationDirection(item, lines);
    if (direction !== "all" && itemDirection !== direction) {
      return false;
    }
    if (status !== "all" && item.status !== status) {
      return false;
    }
    return true;
  });

  return (
    <LogisticsPageShell crumbs={[{ label: "Резервы" }]}>
      <LogisticsToolbar
        title="Резервы"
        actionLabel="Новый резерв"
        onAction={() => setOpen(true)}
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Направление резерва">
          {DIRECTION_FILTERS.map((item) => (
            <HomeFilterChip
              key={item.id}
              active={direction === item.id}
              role="tab"
              aria-selected={direction === item.id}
              onClick={() => setDirection(item.id)}
            >
              {item.label}
            </HomeFilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Статус резерва">
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
        <ReservationHoldTable
          snapshot={snapshot}
          placeHeader="Место"
          rows={rows.map((item) => {
            const lines = snapshot.reservationLines.filter((line) => line.reservationId === item.id);
            return {
              id: item.id,
              number: item.number,
              href: `/store/logistics/reservations/${item.id}`,
              status: item.status,
              direction: reservationDirection(item, lines),
              toOwnerType: item.toOwnerType,
              toOwnerId: item.toOwnerId,
              locationType: item.locationType,
              locationId: item.locationId,
              lines: lines.map((line) => ({
                id: line.id,
                productId: line.productId,
                quantity: line.quantity,
                fromOwnerType: line.fromOwnerType,
                fromOwnerId: line.fromOwnerId,
              })),
            };
          })}
        />
      ) : null}
      <ReservationForm
        snapshot={snapshot}
        balances={balances}
        open={open}
        onOpenChange={setOpen}
        reload={reload}
        mode="list"
        preset={
          direction === "release"
            ? { toOwnerType: null, toOwnerId: null }
            : direction === "reserve"
              ? { toOwnerType: "order" }
              : undefined
        }
      />
    </LogisticsPageShell>
  );
};

export const ReservationDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [lineOpen, setLineOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [newLine, setNewLine] = useState(emptyReservationLine());
  const doc = snapshot.reservations.find((item) => item.id === params.id);
  const lines = useMemo(
    () => snapshot.reservationLines.filter((line) => line.reservationId === params.id),
    [params.id, snapshot.reservationLines],
  );
  const direction = doc ? reservationDirection(doc, lines) : "reserve";
  const productIds = [...new Set(lines.map((line) => line.productId).filter(Boolean))];

  if (isLoading || error || !doc) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Резервы", href: "/store/logistics/reservations" }, { label: "Резерв" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Резерв не найден."} />}
      </LogisticsPageShell>
    );
  }

  const destLabel = ownerLabel(snapshot, doc.toOwnerType, doc.toOwnerId);
  const destHref = hrefForOwner(doc.toOwnerType, doc.toOwnerId);
  const cancelGuidance = projectDocumentCancelGuidance({ type: "reservation", id: doc.id }, snapshot, balances);

  return (
    <LogisticsPageShell crumbs={[{ label: "Резервы", href: "/store/logistics/reservations" }, { label: doc.number }]}>
      <LogisticsToolbar
        title={doc.number}
        actions={
          <>
            {doc.status === "draft" ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void runLogisticsAction(() => postReservation(doc.id), "Резерв проведён", reload);
                }}
              >
                Провести
              </Button>
            ) : null}
            <DocumentCancelControl
              guidance={cancelGuidance}
              reload={reload}
              onFollowUp={(action) => {
                if (action.id === "open-reservation") {
                  setFollowUpOpen(true);
                }
              }}
            />
          </>
        }
      >
        <DocumentStatusBadge status={doc.status as ReservationStatus} />
        <span className="text-sm text-muted-foreground">{RESERVATION_DIRECTION_LABELS[direction]}</span>
      </LogisticsToolbar>
      <RelatedDocuments
        title="Назначение"
        items={
          destHref
            ? [{ id: doc.toOwnerId ?? destLabel, href: destHref, label: destLabel, meta: doc.toOwnerType ?? FREE_OWNER_LABEL }]
            : [{ id: "free", href: "/store/logistics/reservations", label: FREE_OWNER_LABEL, meta: "назначение" }]
        }
      />
      <LogisticsTableCard
        title="Строки"
        action={
          doc.status === "draft" ? (
            <Button type="button" size="sm" onClick={() => setLineOpen(true)}>
              Добавить строку
            </Button>
          ) : undefined
        }
        headers={["Товар", "Источник", "Количество", "Место", "Сейчас доступно", "Комментарий"]}
      >
        {lines.map((line, index) => {
          const product = productById(snapshot, line.productId);
          const qty = getBalanceQuantity(balances, {
            productId: line.productId,
            locationType: doc.locationType,
            locationId: doc.locationId,
            stockState: isFreeOwner(line.fromOwnerType, line.fromOwnerId) ? "free" : "reserved",
            ownerType: line.fromOwnerType,
            ownerId: line.fromOwnerId,
          });
          const sourceHref = hrefForOwner(line.fromOwnerType, line.fromOwnerId);
          const sourceLabel = ownerLabel(snapshot, line.fromOwnerType, line.fromOwnerId);
          return (
            <TableRow key={line.id}>
              <TableCell className="px-3 py-2">
                <ProductIdentity snapshot={snapshot} productId={line.productId} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">
                {sourceHref ? <LogisticsCodeBadge code={sourceLabel} href={sourceHref} /> : sourceLabel}
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(line.quantity, product?.unit)}
              </TableCell>
              {index === 0 ? (
                <TableCell className="px-3 py-2 text-sm" rowSpan={lines.length}>
                  <LocationLink snapshot={snapshot} locationType={doc.locationType} locationId={doc.locationId} showKind />
                </TableCell>
              ) : null}
              <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(qty)}</TableCell>
              {index === 0 ? (
                <TableCell className="px-3 py-2 text-sm" rowSpan={lines.length}>
                  {doc.note || "—"}
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </LogisticsTableCard>
      {productIds.map((productId) => (
        <AvailabilityPanel key={productId} snapshot={snapshot} balances={balances} productId={productId} />
      ))}
      <DocumentLedger
        snapshot={snapshot}
        hide="document"
        filter={(entry) => entry.documentType === "reservation" && entry.documentId === doc.id}
      />
      <LogisticsDialog
        open={lineOpen}
        onOpenChange={(next) => {
          setLineOpen(next);
          if (!next) {
            setNewLine(emptyReservationLine());
          }
        }}
        title="Добавить строку"
      >
        <div className="flex flex-col gap-3">
          <ReservationLineFields
            snapshot={snapshot}
            balances={balances}
            destKind={doc.toOwnerType ?? "free"}
            destOwnerId={doc.toOwnerId ?? ""}
            locationType={doc.locationType}
            locationId={doc.locationId}
            lines={[newLine]}
            index={0}
            onChange={setNewLine}
          />
          <Button
            type="button"
            onClick={() => {
              if (!newLine.productId) {
                toast.error("Выберите товар и количество");
                return;
              }
              const fromOwnerType = newLine.fromOwnerKind === "free" ? null : (newLine.fromOwnerKind as OwnerType);
              const fromOwnerId = newLine.fromOwnerKind === "free" ? null : newLine.fromOwnerId;
              if (lines.some((line) => line.productId === newLine.productId && line.fromOwnerType === fromOwnerType && line.fromOwnerId === fromOwnerId)) {
                toast.error("Этот источник и товар уже есть в документе");
                return;
              }
              const orderLine =
                doc.toOwnerType === "order" && doc.toOwnerId
                  ? orderLineForProduct(snapshot.customerOrderLines, doc.toOwnerId, newLine.productId)
                  : undefined;
              const max = reservationCapForOwner(
                balances,
                newLine.productId,
                doc.locationType,
                doc.locationId,
                fromOwnerType,
                fromOwnerId,
                doc.toOwnerType,
                doc.toOwnerId,
                orderLine?.quantity,
              );
              if (!isAllowedQuantity(newLine.quantity, max)) {
                toast.error("Количество больше доступного");
                return;
              }
              const qty = Number(newLine.quantity);
              try {
                assertEnoughStock(max, qty, isFreeOwner(fromOwnerType, fromOwnerId) ? "free" : "reserved");
                if (orderLine) {
                  assertCustomerCapacity(orderLine, balances, qty);
                }
              } catch (caught) {
                toast.error(caught instanceof Error ? caught.message : "Недостаточно остатка");
                return;
              }
              void runLogisticsAction(
                () =>
                  addReservationLine({
                    reservationId: doc.id,
                    productId: newLine.productId,
                    quantity: qty,
                    fromOwnerType,
                    fromOwnerId,
                  }),
                "Строка добавлена",
                reload,
              ).then((ok) => {
                if (ok) {
                  setLineOpen(false);
                  setNewLine(emptyReservationLine());
                }
              });
            }}
          >
            Добавить
          </Button>
        </div>
      </LogisticsDialog>
      <ReservationForm
        snapshot={snapshot}
        balances={balances}
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        reload={reload}
        mode="hub"
        preset={cancelGuidance.reservationPreset}
      />
    </LogisticsPageShell>
  );
};
