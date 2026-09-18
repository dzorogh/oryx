// english-ui:ignore-file
import { Fragment } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { hrefForCustomerOrder } from "@/features/logistics/logistics-availability";
import { DOCUMENT_STATUS_LABELS, formatQuantity, RESERVATION_OPERATION_LABELS } from "@/features/logistics/logistics-labels";
import { customerOrderById, productById } from "@/features/logistics/logistics-lookups";
import type {
  LogisticsSnapshot,
  ReservationLocationType,
  ReservationOperation,
  ReservationStatus,
} from "@/features/logistics/logistics-types";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { DocumentStatusBadge } from "@/features/logistics/ui/status-badge";

export const HOLD_STATUS_FILTERS: Array<{ id: "all" | ReservationStatus | "cancelled"; label: string }> = [
  { id: "all", label: "Все" },
  { id: "draft", label: DOCUMENT_STATUS_LABELS.draft },
  { id: "posted", label: DOCUMENT_STATUS_LABELS.posted },
  { id: "cancelled", label: DOCUMENT_STATUS_LABELS.cancelled },
];

export type ReservationHoldLine = {
  id: string;
  productId: string;
  quantity: number;
};

export type ReservationHoldRow = {
  id: string;
  number: string;
  href: string;
  customerOrderId: string;
  status: ReservationStatus;
  operation?: ReservationOperation;
  locationType: ReservationLocationType;
  locationId: string;
  lines: ReservationHoldLine[];
};

export const ReservationHoldTable = ({
  snapshot,
  rows,
  placeHeader,
}: {
  snapshot: LogisticsSnapshot;
  rows: ReservationHoldRow[];
  placeHeader: string;
}) => (
  <LogisticsTableCard
    headers={["Номер", "Операция", "Заказ клиента", "Товары", placeHeader, "Статус"]}
    isEmpty={rows.length === 0}
  >
    {rows.map((item) => {
      const order = customerOrderById(snapshot, item.customerOrderId);
      const orderBadge = (
        <LogisticsCodeBadge
          code={order?.number ?? item.customerOrderId}
          href={hrefForCustomerOrder(item.customerOrderId)}
        />
      );
      const numberBadge = <LogisticsCodeBadge code={item.number} href={item.href} />;
      const statusBadge = <DocumentStatusBadge status={item.status} />;
      const operationLabel = item.operation ? RESERVATION_OPERATION_LABELS[item.operation] : "—";
      const placeCell = (
        <LocationLink
          snapshot={snapshot}
          locationType={item.locationType}
          locationId={item.locationId}
          showKind
        />
      );

      if (item.lines.length === 0) {
        return (
          <TableRow key={item.id}>
            <TableCell className="px-3 py-2 align-top">{numberBadge}</TableCell>
            <TableCell className="px-3 py-2 align-top text-sm">{operationLabel}</TableCell>
            <TableCell className="px-3 py-2 align-top">{orderBadge}</TableCell>
            <TableCell className="px-3 py-2 text-sm text-muted-foreground">—</TableCell>
            <TableCell className="px-3 py-2 align-top text-sm">{placeCell}</TableCell>
            <TableCell className="px-3 py-2 align-top">{statusBadge}</TableCell>
          </TableRow>
        );
      }

      return (
        <Fragment key={item.id}>
          {item.lines.map((line, index) => {
            const product = productById(snapshot, line.productId);
            return (
              <TableRow key={line.id}>
                {index === 0 ? (
                  <TableCell className="px-3 py-2 align-top" rowSpan={item.lines.length}>
                    {numberBadge}
                  </TableCell>
                ) : null}
                {index === 0 ? (
                  <TableCell className="px-3 py-2 align-top text-sm" rowSpan={item.lines.length}>
                    {operationLabel}
                  </TableCell>
                ) : null}
                {index === 0 ? (
                  <TableCell className="px-3 py-2 align-top" rowSpan={item.lines.length}>
                    {orderBadge}
                  </TableCell>
                ) : null}
                <TableCell className="px-3 py-2 align-top">
                  <ProductIdentity snapshot={snapshot} productId={line.productId} />
                  <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {formatQuantity(line.quantity, product?.unit)}
                  </div>
                </TableCell>
                {index === 0 ? (
                  <TableCell className="px-3 py-2 align-top" rowSpan={item.lines.length}>
                    {placeCell}
                  </TableCell>
                ) : null}
                {index === 0 ? (
                  <TableCell className="px-3 py-2 align-top" rowSpan={item.lines.length}>
                    {statusBadge}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </Fragment>
      );
    })}
  </LogisticsTableCard>
);
