"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { addReservationLine, loadReservationList, postReservation } from "@/features/logistics/logistics-api";
import { projectDocumentCancelGuidance } from "@/features/logistics/logistics-cancel-guidance";
import { DocumentCancelControl } from "@/features/logistics/ui/document-cancel-guidance";
import { hrefForOwner, reservationCapForOwner } from "@/features/logistics/logistics-availability";
import { emptyReservationLine, ReservationForm, ReservationLineFields } from "@/features/logistics/logistics-forms";
import { FREE_OWNER_LABEL, OWNER_TYPE_LABELS, RESERVATION_DIRECTION_LABELS, formatMetaTimestamp, formatQuantity } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById } from "@/features/logistics/logistics-lookups";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import {
  HOLD_STATUS_FILTERS,
  ReservationHoldTable,
  holdOwnerBadge,
  holdPlace,
} from "@/features/logistics/ui/reservation-hold-list";
import { assertCustomerCapacity, assertEnoughStock } from "@/features/logistics/logistics-rules";
import {
  isFreeOwner,
  matchDocumentParam,
  orderLineForProduct,
  reservationDirection,
  type OwnerType,
  type ReservationDirection,
  type ReservationStatus,
} from "@/features/logistics/logistics-types";
import { buildDocumentTimeline } from "@/features/logistics/document-timeline";
import { DocumentHeader } from "@/features/logistics/ui/document/document-header";
import { DocumentHistory } from "@/features/logistics/ui/document/document-history";
import { DocumentMetaEmpty } from "@/features/logistics/ui/document/document-meta-field";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { DocumentTabs } from "@/features/logistics/ui/document/document-tabs";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { isAllowedQuantity } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { DocumentStatusBadge, StatusPill } from "@/features/logistics/ui/status-badge";
import { useLogisticsList, useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { Lock } from "lucide-react";

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
  const { rows, isLoading, error, reload } = useLogisticsList(loadReservationList);
  const searchParams = useSearchParams();
  const [direction, setDirection] = useState<"all" | ReservationDirection>(
    parseDirectionFilter(searchParams.get("operation")),
  );
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const formStore = useLogisticsStore({ kind: "form", form: "reservation", enabled: open });

  const visible = rows.filter((item) => {
    if (direction !== "all" && item.direction !== direction) {
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
          placeHeader="Место"
          rows={visible.map((item) => ({
            id: item.id,
            number: item.number,
            href: `/store/logistics/reservations/${item.sequenceNumber}`,
            status: item.status,
            direction: item.direction,
            destination: holdOwnerBadge(item.toOwnerType, item.toOwnerId, item.toOwnerNumber),
            place: holdPlace(item),
            lines: item.lines.map((line) => ({
              id: line.id,
              productId: line.productId,
              quantity: line.quantity,
              productName: line.productName,
              productUnit: line.productUnit,
              source: holdOwnerBadge(line.fromOwnerType, line.fromOwnerId, line.fromOwnerNumber),
            })),
          }))}
        />
      ) : null}
      <ReservationForm
        snapshot={formStore.snapshot}
        balances={formStore.balances}
        loading={formStore.isLoading}
        loadError={formStore.error}
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
  const { snapshot, balances, isLoading, error, reload, found } = useLogisticsStore({
    kind: "document",
    documentKind: "reservation",
    ref: String(params.id ?? ""),
  });
  const [lineOpen, setLineOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [newLine, setNewLine] = useState(emptyReservationLine());
  const lineForm = useLogisticsStore({ kind: "form", form: "reservation", enabled: lineOpen });
  const followUpForm = useLogisticsStore({ kind: "form", form: "reservation", enabled: followUpOpen });
  const doc = matchDocumentParam(snapshot.reservations, params.id);
  const lines = useMemo(
    () => (doc ? snapshot.reservationLines.filter((line) => line.reservationId === doc.id) : []),
    [doc, snapshot.reservationLines],
  );
  const direction = doc ? reservationDirection(doc, lines) : "reserve";

  if (isLoading || error || !doc || !found) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Резервы", href: "/store/logistics/reservations" }, { label: "Резерв" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Резерв не найден."} />}
      </LogisticsPageShell>
    );
  }

  const destLabel = ownerLabel(snapshot, doc.toOwnerType, doc.toOwnerId);
  const destHref = hrefForOwner(doc.toOwnerType, doc.toOwnerId);
  const destKindLabel = isFreeOwner(doc.toOwnerType, doc.toOwnerId)
    ? FREE_OWNER_LABEL
    : OWNER_TYPE_LABELS[doc.toOwnerType!];
  const cancelGuidance = projectDocumentCancelGuidance({ type: "reservation", id: doc.id }, snapshot, balances);
  const historyEntries = buildDocumentTimeline(snapshot, {
    documentId: doc.id,
    mode: "reservation",
    createdAt: doc.createdAt,
    createdBy: doc.createdBy,
    postedAt: doc.postedAt,
  });
  const movementCount = snapshot.transactions.filter(
    (entry) => entry.documentType === "reservation" && entry.documentId === doc.id,
  ).length;

  return (
    <LogisticsPageShell crumbs={[{ label: "Резервы", href: "/store/logistics/reservations" }, { label: doc.number }]}>
      <DocumentHeader
        kind="Резерв"
        icon={Lock}
        number={doc.number}
        status={<DocumentStatusBadge status={doc.status as ReservationStatus} />}
        description={doc.description || doc.note || undefined}
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
        meta={[
          {
            label: "Операция",
            value: (
              <StatusPill status="neutral" label={RESERVATION_DIRECTION_LABELS[direction]} />
            ),
          },
          {
            label: "Назначение",
            value: (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-foreground font-medium">{destKindLabel}</span>
                {destHref ? (
                  <LogisticsCodeBadge code={destLabel} href={destHref} />
                ) : isFreeOwner(doc.toOwnerType, doc.toOwnerId) ? null : (
                  <span>{destLabel}</span>
                )}
              </span>
            ),
          },
          { label: "Создан", value: formatMetaTimestamp(doc.createdAt) },
          {
            label: "Проведён",
            value: doc.postedAt ? formatMetaTimestamp(doc.postedAt) : <DocumentMetaEmpty />,
          },
          {
            label: "Автор",
            value: snapshot.users.find((user) => user.id === doc.createdBy)?.name ?? "—",
          },
        ]}
      />
      <DocumentTabs
        tabs={[
          {
            id: "products",
            label: "Товары",
            count: lines.length,
            panel: (
              <DocumentSection
                title="Товары"
                tools={
                  doc.status === "draft" ? (
                    <Button type="button" size="sm" onClick={() => setLineOpen(true)}>
                      Добавить строку
                    </Button>
                  ) : undefined
                }
              >
                <LogisticsTableCard
                  embedded
                  headers={["Товар", "Источник", "Место", "Количество"]}
                  numericColumns={[3]}
                  isEmpty={lines.length === 0}
                >
                  {lines.map((line, index) => {
                    const product = productById(snapshot, line.productId);
                    const sourceHref = hrefForOwner(line.fromOwnerType, line.fromOwnerId);
                    const sourceLabel = isFreeOwner(line.fromOwnerType, line.fromOwnerId)
                      ? FREE_OWNER_LABEL
                      : ownerLabel(snapshot, line.fromOwnerType, line.fromOwnerId);
                    const sourceKind = isFreeOwner(line.fromOwnerType, line.fromOwnerId)
                      ? null
                      : OWNER_TYPE_LABELS[line.fromOwnerType!];
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="px-3 py-2">
                          <ProductIdentity snapshot={snapshot} productId={line.productId} />
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm">
                          {sourceHref ? (
                            <span className="inline-flex items-center gap-1.5">
                              {sourceKind ? (
                                <span className="text-foreground font-medium">{sourceKind}</span>
                              ) : null}
                              <LogisticsCodeBadge
                                code={sourceLabel}
                                href={sourceHref}
                              />
                            </span>
                          ) : (
                            sourceLabel
                          )}
                        </TableCell>
                        {index === 0 ? (
                          <TableCell className="px-3 py-2 text-sm" rowSpan={lines.length}>
                            <LocationLink
                              snapshot={snapshot}
                              locationType={doc.locationType}
                              locationId={doc.locationId}
                              showKind
                            />
                          </TableCell>
                        ) : null}
                        <TableCell className="px-3 py-2 text-right text-sm font-medium tabular-nums">
                          {formatQuantity(line.quantity, product?.unit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </LogisticsTableCard>
              </DocumentSection>
            ),
          },
          {
            id: "movements",
            label: "Движения",
            count: movementCount,
            panel: (
              <DocumentSection title="Движения">
                <DocumentLedger
                  bare
                  snapshot={snapshot}
                  hide="document"
                  filter={(entry) => entry.documentType === "reservation" && entry.documentId === doc.id}
                />
              </DocumentSection>
            ),
          },
          {
            id: "history",
            label: "История",
            count: historyEntries.length,
            panel: <DocumentHistory entries={historyEntries} />,
          },
        ]}
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
        loading={lineForm.isLoading}
        error={lineForm.error}
      >
        <div className="flex flex-col gap-3">
          <ReservationLineFields
            snapshot={lineForm.snapshot}
            balances={lineForm.balances}
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
              if (
                lines.some(
                  (line) =>
                    line.productId === newLine.productId &&
                    line.fromOwnerType === fromOwnerType &&
                    line.fromOwnerId === fromOwnerId,
                )
              ) {
                toast.error("Этот источник и товар уже есть в документе");
                return;
              }
              const orderLine =
                doc.toOwnerType === "order" && doc.toOwnerId
                  ? orderLineForProduct(lineForm.snapshot.customerOrderLines, doc.toOwnerId, newLine.productId)
                  : undefined;
              const max = reservationCapForOwner(
                lineForm.balances,
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
                  assertCustomerCapacity(orderLine, lineForm.balances, qty);
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
      {followUpOpen ? (
        <ReservationForm
          snapshot={followUpForm.snapshot}
          balances={followUpForm.balances}
          loading={followUpForm.isLoading}
          loadError={followUpForm.error}
          open
          onOpenChange={setFollowUpOpen}
          reload={reload}
          mode="hub"
          preset={cancelGuidance.reservationPreset}
        />
      ) : null}
    </LogisticsPageShell>
  );
};
