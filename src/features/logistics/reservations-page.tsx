"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { getBalanceQuantity } from "@/features/logistics/logistics-balances";
import { addReservationLine, postReservation } from "@/features/logistics/logistics-api";
import { hrefForCustomerOrder, remainingToReserveForLine, reservationCap } from "@/features/logistics/logistics-availability";
import {
  emptyReservationLine,
  ReservationForm,
  ReservationLineFields,
} from "@/features/logistics/logistics-forms";
import { formatQuantity, RESERVATION_OPERATION_LABELS } from "@/features/logistics/logistics-labels";
import { customerOrderById, productById } from "@/features/logistics/logistics-lookups";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { HOLD_STATUS_FILTERS, ReservationHoldTable } from "@/features/logistics/ui/reservation-hold-list";
import { assertCustomerCapacity, assertEnoughStock } from "@/features/logistics/logistics-rules";
import type { ReservationOperation, ReservationStatus } from "@/features/logistics/logistics-types";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { isAllowedQuantity } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { RelatedDocuments } from "@/features/logistics/ui/related-documents";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { DocumentStatusBadge } from "@/features/logistics/ui/status-badge";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const OPERATION_FILTERS: Array<{ id: "all" | ReservationOperation; label: string }> = [
  { id: "all", label: "All" },
  { id: "reserve", label: RESERVATION_OPERATION_LABELS.reserve },
  { id: "release", label: RESERVATION_OPERATION_LABELS.release },
];

const STATUS_FILTERS = HOLD_STATUS_FILTERS.filter((item) => item.id !== "cancelled");

export const ReservationsPage = () => {
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const searchParams = useSearchParams();
  const initialOperation = searchParams.get("operation");
  const [operation, setOperation] = useState<"all" | ReservationOperation>(
    initialOperation === "reserve" || initialOperation === "release" ? initialOperation : "all",
  );
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const rows = snapshot.reservations.filter((item) => {
    if (operation !== "all" && item.operation !== operation) {
      return false;
    }
    if (status !== "all" && item.status !== status) {
      return false;
    }
    return true;
  });

  return (
    <LogisticsPageShell crumbs={[{ label: "Reservations" }]}>
      <LogisticsToolbar
        title="Reservations"
        description="Reserve moves free to reserved; release moves reserved to free. One document is one order, one place, one operation."
        actionLabel="New reservation"
        onAction={() => setOpen(true)}
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Reservation operation">
          {OPERATION_FILTERS.map((item) => (
            <HomeFilterChip
              key={item.id}
              active={operation === item.id}
              role="tab"
              aria-selected={operation === item.id}
              onClick={() => setOperation(item.id)}
            >
              {item.label}
            </HomeFilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Reservation status">
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
          placeHeader="Place"
          rows={rows.map((item) => ({
            id: item.id,
            number: item.number,
            href: `/store/logistics/reservations/${item.id}`,
            customerOrderId: item.customerOrderId,
            status: item.status,
            operation: item.operation,
            locationType: item.locationType,
            locationId: item.locationId,
            lines: snapshot.reservationLines
              .filter((line) => line.reservationId === item.id)
              .map((line) => {
                const orderLine = snapshot.customerOrderLines.find((entry) => entry.id === line.customerOrderLineId);
                return {
                  id: line.id,
                  productId: orderLine?.productId ?? "",
                  quantity: line.quantity,
                };
              }),
          }))}
        />
      ) : null}
      <ReservationForm
        snapshot={snapshot}
        balances={balances}
        open={open}
        onOpenChange={setOpen}
        reload={reload}
        mode="list"
        preset={operation === "all" ? undefined : { operation }}
      />
    </LogisticsPageShell>
  );
};

export const ReservationDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [lineOpen, setLineOpen] = useState(false);
  const [newLine, setNewLine] = useState(emptyReservationLine());
  const doc = snapshot.reservations.find((item) => item.id === params.id);
  const lines = useMemo(
    () => snapshot.reservationLines.filter((line) => line.reservationId === params.id),
    [params.id, snapshot.reservationLines],
  );
  const productIds = [
    ...new Set(
      lines
        .map((line) => snapshot.customerOrderLines.find((item) => item.id === line.customerOrderLineId)?.productId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (isLoading || error || !doc) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Reservations", href: "/store/logistics/reservations" }, { label: "Reservation" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Reservation not found."} />}
      </LogisticsPageShell>
    );
  }

  const order = customerOrderById(snapshot, doc.customerOrderId);

  return (
    <LogisticsPageShell crumbs={[{ label: "Reservations", href: "/store/logistics/reservations" }, { label: doc.number }]}>
      <LogisticsToolbar
        title={doc.number}
        description={
          doc.operation === "reserve"
            ? "Move free stock into reserved for this order at one place. Posted documents are immutable."
            : "Return reserved quantity to free stock at the same place. Posted documents are immutable."
        }
        actions={
          doc.status === "draft" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void runLogisticsAction(() => postReservation(doc.id), "Reservation posted", reload);
              }}
            >
              Post
            </Button>
          ) : null
        }
      >
        <DocumentStatusBadge status={doc.status as ReservationStatus} />
        <span className="text-sm text-muted-foreground">{RESERVATION_OPERATION_LABELS[doc.operation]}</span>
      </LogisticsToolbar>
      <RelatedDocuments
        title="Order"
        items={
          order
            ? [{ id: order.id, href: hrefForCustomerOrder(order.id), label: order.number, meta: order.status }]
            : []
        }
      />
      <LogisticsTableCard
        title="Products"
        action={
          doc.status === "draft" &&
          snapshot.customerOrderLines.some(
            (line) => line.orderId === doc.customerOrderId && !lines.some((item) => item.customerOrderLineId === line.id),
          ) ? (
            <Button type="button" size="sm" onClick={() => setLineOpen(true)}>
              Add product
            </Button>
          ) : undefined
        }
        headers={["Product", "Quantity", "Place", doc.operation === "reserve" ? "Free now" : "Reserved now", "Note"]}
      >
        {lines.map((line, index) => {
          const orderLine = snapshot.customerOrderLines.find((item) => item.id === line.customerOrderLineId);
          const productId = orderLine?.productId ?? "";
          const product = productById(snapshot, productId);
          const qty = getBalanceQuantity(balances, {
            productId,
            locationType: doc.locationType,
            locationId: doc.locationId,
            stockState: doc.operation === "reserve" ? "free" : "reserved",
            customerOrderId: doc.operation === "release" ? doc.customerOrderId : null,
            customerOrderLineId: doc.operation === "release" ? line.customerOrderLineId : null,
          });
          return (
            <TableRow key={line.id}>
              <TableCell className="px-3 py-2">
                <ProductIdentity snapshot={snapshot} productId={productId} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(line.quantity, product?.unit)}
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
      <DocumentLedger snapshot={snapshot} filter={(entry) => entry.sourceId === doc.id && entry.sourceType === "reservation"} />
      <LogisticsDialog
        open={lineOpen}
        onOpenChange={(next) => {
          setLineOpen(next);
          if (!next) {
            setNewLine(emptyReservationLine());
          }
        }}
        title="Add product"
        description="Lines can be added while the reservation is still a draft."
      >
        <div className="flex flex-col gap-3">
          <ReservationLineFields
            snapshot={snapshot}
            balances={balances}
            orderId={doc.customerOrderId}
            operation={doc.operation}
            locationType={doc.locationType}
            locationId={doc.locationId}
            lines={[newLine]}
            index={0}
            excludeLineIds={lines.map((line) => line.customerOrderLineId)}
            onChange={setNewLine}
          />
          <Button
            type="button"
            onClick={() => {
              const orderLine = snapshot.customerOrderLines.find((item) => item.id === newLine.customerOrderLineId);
              if (!orderLine) {
                toast.error("Select a product and quantity");
                return;
              }
              if (lines.some((line) => line.customerOrderLineId === orderLine.id)) {
                toast.error("Each product can appear only once");
                return;
              }
              const max =
                doc.operation === "reserve"
                  ? reservationCap(orderLine, balances, doc.locationType, doc.locationId)
                  : getBalanceQuantity(balances, {
                      productId: orderLine.productId,
                      locationType: doc.locationType,
                      locationId: doc.locationId,
                      stockState: "reserved",
                      customerOrderId: doc.customerOrderId,
                      customerOrderLineId: orderLine.id,
                    });
              if (!isAllowedQuantity(newLine.quantity, max)) {
                toast.error("Quantity exceeds what is available");
                return;
              }
              const qty = Number(newLine.quantity);
              try {
                assertEnoughStock(max, qty, doc.operation === "reserve" ? "free" : "reserved");
                if (doc.operation === "reserve") {
                  assertCustomerCapacity(orderLine, balances, qty);
                }
              } catch (caught) {
                toast.error(caught instanceof Error ? caught.message : "Not enough stock");
                return;
              }
              void runLogisticsAction(
                () =>
                  addReservationLine({
                    reservationId: doc.id,
                    customerOrderLineId: orderLine.id,
                    quantity: qty,
                  }),
                "Product added",
                reload,
              ).then((ok) => {
                if (ok) {
                  setLineOpen(false);
                  setNewLine(emptyReservationLine());
                }
              });
            }}
          >
            Add
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};
