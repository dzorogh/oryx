"use client";

import {
  ADJUSTMENT_OPERATION_LABELS,
  OUTPUT_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  FREE_OWNER_LABEL,
  RESERVATION_DIRECTION_LABELS,
  TRANSFER_STATUS_LABELS,
  formatExpectedEnd,
  formatQuantity,
  formatSignedQuantity,
} from "@/features/logistics/logistics-labels";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import type {
  AdjustmentListRow,
  CustomerOrderListRow,
  OutputListRow,
  ProductionOrderListRow,
  ReservationListRow,
  ShipmentListRow,
  TransferListRow,
} from "@/features/logistics/logistics-list-types";
import type { OutputStatus, ProductionStatus, TransferStatus } from "@/features/logistics/logistics-types";
import {
  OutputStatusBadge,
  ProductionStatusBadge,
  ShipmentDirectionBadge,
  TransferStatusBadge,
} from "@/features/logistics/ui/status-badge";
import { DocumentProductLines } from "@/features/logistics/ui/document-product-lines";
import { hrefForProductionOrder, hrefForTransfer } from "@/features/logistics/logistics-availability";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { holdOwnerBadge, holdPlace } from "@/features/logistics/ui/reservation-hold-list";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import type { ListColumnDef, ListGroupDef, ListSortDef } from "./list-types";
import {
  listAuthorColumn,
  listCreatedColumn,
  listCustomerOrderLinkColumn,
  listDeadlineColumn,
  listDeadlineGroup,
  listNumberColumn,
  listPlantColumn,
  listProductsColumn,
  listQuantityColumn,
  ListQuantity,
} from "./list-helpers";
import { sumProductQuantities as sumQty } from "./list-view-state";

const isOpenProduction = (status: string) => status !== "done" && status !== "closed" && status !== "cancelled";
const isOpenTransfer = (status: string) =>
  status === "draft" || status === "in_progress" || status === "sent";

export const productionOrderColumns: ListColumnDef<ProductionOrderListRow>[] = [
  listNumberColumn((row) => `/store/logistics/production-orders/${row.sequenceNumber}`),
  listPlantColumn<ProductionOrderListRow>(),
  listProductsColumn<ProductionOrderListRow>(),
  listQuantityColumn<ProductionOrderListRow>(),
  {
    id: "status",
    label: "Статус",
    sortType: "text",
    sortValue: (row) => row.status,
    render: (row) => <ProductionStatusBadge status={row.status} />,
  },
  listDeadlineColumn<ProductionOrderListRow>(isOpenProduction),
  listCreatedColumn<ProductionOrderListRow>(),
  listAuthorColumn<ProductionOrderListRow>(),
];

export const productionOrderSortDefs: ListSortDef<ProductionOrderListRow>[] = [
  { id: "created", label: "Дата создания", type: "date", value: (row) => row.createdAt },
  { id: "deadline", label: "Срок", type: "date", value: (row) => row.expectedEndOn },
  { id: "number", label: "Номер", type: "text", value: (row) => row.number },
];

export const productionOrderGroupDefs = (): ListGroupDef<ProductionOrderListRow>[] => [
  listDeadlineGroup<ProductionOrderListRow>(isOpenProduction),
  {
    id: "plant",
    label: "Завод",
    key: (row) => row.plantId,
    renderHeader: (key) => formatLogisticsCode("plant", key),
  },
  {
    id: "status",
    label: "Статус",
    key: (row) => row.status,
    renderHeader: (key) => PRODUCTION_STATUS_LABELS[key as ProductionStatus] ?? key,
  },
];

export const transferColumns: ListColumnDef<TransferListRow>[] = [
  listNumberColumn((row) => hrefForTransfer(row.sequenceNumber)),
  {
    id: "from",
    label: "Откуда",
    sortType: "number",
    sortValue: (row) => Number(row.fromWarehouseId),
    render: (row) => <WarehouseLink warehouseId={row.fromWarehouseId} />,
  },
  {
    id: "to",
    label: "Куда",
    sortType: "number",
    sortValue: (row) => Number(row.toWarehouseId),
    render: (row) => <WarehouseLink warehouseId={row.toWarehouseId} />,
  },
  listProductsColumn<TransferListRow>(),
  listQuantityColumn<TransferListRow>(),
  {
    id: "status",
    label: "Статус",
    sortType: "text",
    sortValue: (row) => row.status,
    render: (row) => <TransferStatusBadge status={row.status} />,
  },
  listDeadlineColumn<TransferListRow>(isOpenTransfer),
  listCreatedColumn<TransferListRow>(),
  listAuthorColumn<TransferListRow>(),
];

export const transferSortDefs: ListSortDef<TransferListRow>[] = [
  { id: "created", label: "Дата создания", type: "date", value: (row) => row.createdAt },
  { id: "deadline", label: "Срок", type: "date", value: (row) => row.expectedEndOn },
];

export const transferGroupDefs = (): ListGroupDef<TransferListRow>[] => [
  listDeadlineGroup<TransferListRow>(isOpenTransfer),
  {
    id: "route",
    label: "Маршрут",
    key: (row) => `${row.fromWarehouseId}:${row.toWarehouseId}`,
    renderHeader: (key, rows) => {
      const row = rows[0];
      if (!row) return key;
      return `${formatLogisticsCode("warehouse", row.fromWarehouseId)} → ${formatLogisticsCode("warehouse", row.toWarehouseId)}`;
    },
  },
  {
    id: "status",
    label: "Статус",
    key: (row) => row.status,
    renderHeader: (key) => TRANSFER_STATUS_LABELS[key as TransferStatus] ?? key,
  },
  {
    id: "from",
    label: "Откуда",
    key: (row) => row.fromWarehouseId,
    renderHeader: (key) => formatLogisticsCode("warehouse", key),
  },
];

export const shipmentColumns: ListColumnDef<ShipmentListRow>[] = [
  listNumberColumn((row) => `/store/logistics/shipments/${row.sequenceNumber}`),
  {
    id: "type",
    label: "Тип",
    sortType: "text",
    sortValue: (row) => row.direction,
    render: (row) => <ShipmentDirectionBadge direction={row.direction} />,
  },
  listCustomerOrderLinkColumn<ShipmentListRow>(),
  {
    id: "warehouse",
    label: "Склад",
    sortType: "number",
    sortValue: (row) =>
      Number(row.fromLocationType === "warehouse" ? row.fromLocationId : row.toLocationId),
    render: (row) => {
      const warehouseId =
        row.fromLocationType === "warehouse"
          ? row.fromLocationId
          : row.toLocationType === "warehouse"
            ? row.toLocationId
            : "";
      return warehouseId ? <WarehouseLink warehouseId={warehouseId} /> : "—";
    },
  },
  listProductsColumn<ShipmentListRow>(),
  listQuantityColumn<ShipmentListRow>("Кол-во"),
  listCreatedColumn<ShipmentListRow>(),
  listAuthorColumn<ShipmentListRow>(),
];

export const shipmentSortDefs: ListSortDef<ShipmentListRow>[] = [
  { id: "created", label: "Дата", type: "date", value: (row) => row.createdAt },
  { id: "number", label: "Номер", type: "text", value: (row) => row.number },
  { id: "quantity", label: "Кол-во", type: "number", value: (row) => sumQty(row.products) },
];

export const shipmentGroupDefs: ListGroupDef<ShipmentListRow>[] = [
  {
    id: "type",
    label: "Тип",
    key: (row) => row.direction,
    renderHeader: (key) => (key === "return" ? "Возврат" : "Отгрузка"),
  },
  {
    id: "warehouse",
    label: "Склад",
    key: (row) =>
      row.fromLocationType === "warehouse" ? row.fromLocationId : row.toLocationId,
    renderHeader: (key) => formatLogisticsCode("warehouse", key),
  },
  {
    id: "customerOrder",
    label: "Заказ клиента",
    key: (row) => row.customerOrderId || "—",
    renderHeader: (key, rows) => rows[0]?.customerOrderNumber || (key === "—" ? "Без заказа" : key),
  },
];

export const outputColumns: ListColumnDef<OutputListRow>[] = [
  listNumberColumn((row) => `/store/logistics/outputs/${row.sequenceNumber}`),
  {
    id: "productionOrder",
    label: "Заказ на производство",
    sortType: "text",
    sortValue: (row) => row.productionOrderNumber,
    render: (row) => (
      <LogisticsCodeBadge
        code={row.productionOrderNumber || row.productionOrderId}
        href={hrefForProductionOrder(row.productionOrderSequenceNumber || row.productionOrderId)}
      />
    ),
  },
  listPlantColumn<OutputListRow>(),
  listProductsColumn<OutputListRow>(),
  listQuantityColumn<OutputListRow>(),
  {
    id: "status",
    label: "Статус",
    sortType: "text",
    sortValue: (row) => row.status,
    render: (row) => <OutputStatusBadge status={row.status} />,
  },
  listDeadlineColumn<OutputListRow>((status) => status !== "done" && status !== "cancelled"),
  listCreatedColumn<OutputListRow>(),
  listAuthorColumn<OutputListRow>(),
];

export const outputSortDefs: ListSortDef<OutputListRow>[] = [
  { id: "created", label: "Дата создания", type: "date", value: (row) => row.createdAt },
  { id: "deadline", label: "Срок", type: "date", value: (row) => row.expectedEndOn },
  { id: "number", label: "Номер", type: "text", value: (row) => row.number },
];

export const outputGroupDefs = (): ListGroupDef<OutputListRow>[] => [
  listDeadlineGroup<OutputListRow>((status) => status !== "done" && status !== "cancelled"),
  {
    id: "plant",
    label: "Завод",
    key: (row) => row.plantId,
    renderHeader: (key) => formatLogisticsCode("plant", key),
  },
  {
    id: "status",
    label: "Статус",
    key: (row) => row.status,
    renderHeader: (key) => OUTPUT_STATUS_LABELS[key as OutputStatus] ?? key,
  },
  {
    id: "productionOrder",
    label: "Заказ на производство",
    key: (row) => row.productionOrderId,
    renderHeader: (key, rows) => rows[0]?.productionOrderNumber || key,
  },
];

export const adjustmentColumns: ListColumnDef<AdjustmentListRow>[] = [
  listNumberColumn((row) => `/store/logistics/adjustments/${row.sequenceNumber}`),
  {
    id: "operation",
    label: "Операция",
    sortType: "text",
    sortValue: (row) => row.operation,
    render: (row) => ADJUSTMENT_OPERATION_LABELS[row.operation],
  },
  {
    id: "warehouse",
    label: "Склад",
    sortType: "number",
    sortValue: (row) => (row.warehouseId ? Number(row.warehouseId) : null),
    render: (row) => (row.warehouseId ? <WarehouseLink warehouseId={row.warehouseId} /> : "—"),
  },
  listProductsColumn<AdjustmentListRow>(),
  {
    id: "change",
    label: "Изменение",
    align: "right",
    sortType: "number",
    sortValue: (row) => row.signedQuantity,
    render: (row) => (
      <span className={row.signedQuantity >= 0 ? "text-green-700" : "text-destructive"}>
        {formatSignedQuantity(row.signedQuantity)}
      </span>
    ),
  },
  {
    id: "description",
    label: "Описание",
    defaultHidden: true,
    sortType: "text",
    sortValue: (row) => row.description,
    render: (row) => row.description || "—",
  },
  listCreatedColumn<AdjustmentListRow>(),
  listAuthorColumn<AdjustmentListRow>(),
];

export const adjustmentSortDefs: ListSortDef<AdjustmentListRow>[] = [
  { id: "created", label: "Дата", type: "date", value: (row) => row.createdAt },
  { id: "change", label: "Изменение", type: "number", value: (row) => row.signedQuantity },
];

export const adjustmentGroupDefs = (): ListGroupDef<AdjustmentListRow>[] => [
  {
    id: "warehouse",
    label: "Склад",
    key: (row) => row.warehouseId,
    renderHeader: (key) => formatLogisticsCode("warehouse", key),
  },
  {
    id: "operation",
    label: "Операция",
    key: (row) => row.operation,
    renderHeader: (key) => ADJUSTMENT_OPERATION_LABELS[key as AdjustmentListRow["operation"]] ?? key,
  },
];

export const reservationColumns: ListColumnDef<ReservationListRow>[] = [
  listNumberColumn((row) => `/store/logistics/reservations/${row.sequenceNumber}`),
  {
    id: "operation",
    label: "Операция",
    sortType: "text",
    sortValue: (row) => row.direction,
    render: (row) => RESERVATION_DIRECTION_LABELS[row.direction],
  },
  {
    id: "destination",
    label: "Назначение",
    sortType: "text",
    sortValue: (row) => row.toOwnerNumber ?? "",
    render: (row) => {
      const badge = holdOwnerBadge(row.toOwnerType, row.toOwnerId, row.toOwnerNumber);
      return badge.href ? (
        <LogisticsCodeBadge code={badge.label} href={badge.href} />
      ) : (
        badge.label
      );
    },
  },
  {
    id: "products",
    label: "Товары и источник",
    minWidth: "340px",
    render: (row) => (
      <DocumentProductLines
        lines={reservationListProducts(row)}
        renderLineExtra={(line) => {
          const source = holdOwnerBadge(
            (line as { fromOwnerType?: ReservationListRow["toOwnerType"] }).fromOwnerType ?? null,
            (line as { fromOwnerId?: string | null }).fromOwnerId ?? null,
            (line as { fromOwnerNumber?: string | null }).fromOwnerNumber ?? null,
          );
          if (source.label === FREE_OWNER_LABEL) {
            return null;
          }
          return (
            <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              из
              {source.href ? <LogisticsCodeBadge code={source.label} href={source.href} /> : source.label}
            </span>
          );
        }}
      />
    ),
  },
  {
    id: "quantity",
    label: "Кол-во",
    align: "right",
    sortType: "number",
    sortValue: (row) => sumQty(row.lines),
    render: (row) => <ListQuantity value={sumQty(row.lines)} />,
  },
  {
    id: "place",
    label: "Место",
    sortType: "text",
    sortValue: (row) => holdPlace(row).label,
    render: (row) => {
      const place = holdPlace(row);
      return place.href ? <LogisticsCodeBadge code={place.label} href={place.href} /> : place.label;
    },
  },
  listCreatedColumn<ReservationListRow>(),
  listAuthorColumn<ReservationListRow>(),
];

export const reservationSortDefs: ListSortDef<ReservationListRow>[] = [
  { id: "created", label: "Дата создания", type: "date", value: (row) => row.createdAt },
  { id: "number", label: "Номер", type: "text", value: (row) => row.number },
];

export const reservationGroupDefs: ListGroupDef<ReservationListRow>[] = [
  {
    id: "place",
    label: "Место",
    key: (row) => row.locationId,
    renderHeader: (key, rows) => {
      const row = rows[0];
      return row ? holdPlace(row).label : key;
    },
  },
  {
    id: "destination",
    label: "Назначение",
    key: (row) => row.toOwnerId ?? "free",
    renderHeader: (key, rows) => {
      const row = rows[0];
      if (!row) return key;
      return holdOwnerBadge(row.toOwnerType, row.toOwnerId, row.toOwnerNumber).label;
    },
  },
  {
    id: "operation",
    label: "Операция",
    key: (row) => row.direction,
    renderHeader: (key) => RESERVATION_DIRECTION_LABELS[key as ReservationListRow["direction"]] ?? key,
  },
];

export const reservationListProducts = (row: ReservationListRow) =>
  row.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    productName: line.productName,
    productUnit: line.productUnit,
    fromOwnerType: line.fromOwnerType,
    fromOwnerId: line.fromOwnerId,
    fromOwnerNumber: line.fromOwnerNumber,
  }));
