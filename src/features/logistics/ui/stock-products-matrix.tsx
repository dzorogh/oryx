// english-ui:ignore-file
"use client";

import { Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ASSIGNED_TO_LABEL } from "@/features/logistics/logistics-labels";
import { productById, regionById, regionCode, warehouseCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import type { StockGroup } from "@/features/logistics/stock-filters";
import type {
  StockProductMatrixRow,
  StockRegionSection,
  StockWarehouseSection,
} from "@/features/logistics/stock-product-matrix";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

const QUANTITY_HEAD =
  "h-8 min-w-[4.5rem] px-3 text-right text-xs font-medium text-muted-foreground";
const QUANTITY_CELL = "px-3 py-2 text-right text-sm";
const IDENTITY_HEAD = "sticky left-0 z-20 min-w-44 bg-card px-3 text-left text-xs font-medium";
const IDENTITY_CELL = "sticky left-0 z-10 min-w-44 bg-card px-3 py-2";

const formatStockQuantity = (quantity: number, unit?: string): string => {
  const normalized = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
  return unit ? `${normalized} ${unit}` : normalized;
};

const StockQty = ({ quantity, unit }: { quantity: number; unit?: string }) => (
  <span
    className={cn(
      "tabular-nums",
      quantity < 0 ? "text-destructive" : quantity === 0 ? "text-muted-foreground" : "font-medium text-foreground",
    )}
  >
    {formatStockQuantity(quantity, unit)}
  </span>
);

const unitFor = (snapshot: LogisticsSnapshot, productId: string): string | undefined =>
  productById(snapshot, productId)?.unit;

const MatrixEmpty = ({ colSpan, message }: { colSpan: number; message: string }) => (
  <TableRow className="hover:bg-transparent">
    <TableCell colSpan={colSpan} className="px-3 py-8 text-center text-sm text-muted-foreground">
      {message}
    </TableCell>
  </TableRow>
);

const SectionRow = ({ label, colSpan }: { label: string; colSpan: number }) => (
  <TableRow className="hover:bg-transparent">
    <TableHead
      scope="rowgroup"
      colSpan={colSpan}
      className="sticky left-0 bg-muted/60 px-3 py-1.5 text-left text-xs font-semibold text-foreground"
    >
      {label}
    </TableHead>
  </TableRow>
);

const ProductsMatrixTable = ({
  snapshot,
  rows,
  empty,
}: {
  snapshot: LogisticsSnapshot;
  rows: StockProductMatrixRow[];
  empty: string;
}) => (
  <Table className="w-max min-w-full">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead scope="col" rowSpan={2} className={cn(IDENTITY_HEAD, "align-bottom")}>
          Товар
        </TableHead>
        <TableHead scope="colgroup" colSpan={3} className="h-8 px-3 text-center text-xs font-medium">
          {ASSIGNED_TO_LABEL}
        </TableHead>
        <TableHead
          scope="colgroup"
          colSpan={3}
          className="h-8 border-l-2 border-border px-3 text-center text-xs font-medium"
        >
          Место
        </TableHead>
      </TableRow>
      <TableRow className="hover:bg-transparent">
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Свободно
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Резерв региона
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Резерв заказа
        </TableHead>
        <TableHead scope="col" className={cn(QUANTITY_HEAD, "border-l-2 border-border")}>
          Склады
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Производство
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Перемещения
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.length === 0 ? (
        <MatrixEmpty colSpan={7} message={empty} />
      ) : (
        rows.map((row) => {
          const unit = unitFor(snapshot, row.productId);
          return (
            <TableRow key={row.productId}>
              <TableCell className={IDENTITY_CELL}>
                <ProductIdentity snapshot={snapshot} productId={row.productId} />
              </TableCell>
              <TableCell className={QUANTITY_CELL}>
                <StockQty quantity={row.owner.free} unit={unit} />
              </TableCell>
              <TableCell className={QUANTITY_CELL}>
                <StockQty quantity={row.owner.regionReserve} unit={unit} />
              </TableCell>
              <TableCell className={QUANTITY_CELL}>
                <StockQty quantity={row.owner.orderReserve} unit={unit} />
              </TableCell>
              <TableCell className={cn(QUANTITY_CELL, "border-l-2 border-border")}>
                <StockQty quantity={row.location.warehouses} unit={unit} />
              </TableCell>
              <TableCell className={QUANTITY_CELL}>
                <StockQty quantity={row.location.production} unit={unit} />
              </TableCell>
              <TableCell className={QUANTITY_CELL}>
                <StockQty quantity={row.location.transfers} unit={unit} />
              </TableCell>
            </TableRow>
          );
        })
      )}
    </TableBody>
  </Table>
);

const WarehousesMatrixTable = ({
  snapshot,
  sections,
  empty,
}: {
  snapshot: LogisticsSnapshot;
  sections: StockWarehouseSection[];
  empty: string;
}) => (
  <Table className="w-max min-w-full">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead scope="col" className={IDENTITY_HEAD}>
          Товар
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Свободно
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Резерв региона
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Резерв заказа
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Наличие
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {sections.length === 0 ? (
        <MatrixEmpty colSpan={5} message={empty} />
      ) : (
        sections.map((section) => {
          const label = warehouseCode(snapshot, section.warehouseId);
          return (
            <Fragment key={section.warehouseId}>
              <SectionRow label={label} colSpan={5} />
              {section.rows.map((row) => {
                const unit = unitFor(snapshot, row.productId);
                return (
                  <TableRow key={`${section.warehouseId}:${row.productId}`}>
                    <TableCell className={IDENTITY_CELL}>
                      <ProductIdentity snapshot={snapshot} productId={row.productId} />
                    </TableCell>
                    <TableCell className={QUANTITY_CELL}>
                      <StockQty quantity={row.free} unit={unit} />
                    </TableCell>
                    <TableCell className={QUANTITY_CELL}>
                      <StockQty quantity={row.regionReserve} unit={unit} />
                    </TableCell>
                    <TableCell className={QUANTITY_CELL}>
                      <StockQty quantity={row.orderReserve} unit={unit} />
                    </TableCell>
                    <TableCell className={QUANTITY_CELL}>
                      <StockQty quantity={row.onHand} unit={unit} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </Fragment>
          );
        })
      )}
    </TableBody>
  </Table>
);

const RegionsMatrixTable = ({
  snapshot,
  sections,
  empty,
}: {
  snapshot: LogisticsSnapshot;
  sections: StockRegionSection[];
  empty: string;
}) => (
  <Table className="w-max min-w-full">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead scope="col" className={IDENTITY_HEAD}>
          Товар
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Склады
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Производство
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Перемещения
        </TableHead>
        <TableHead scope="col" className={QUANTITY_HEAD}>
          Резерв региона
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {sections.length === 0 ? (
        <MatrixEmpty colSpan={5} message={empty} />
      ) : (
        sections.map((section) => {
          const region = regionById(snapshot, section.regionId);
          const label = region ? `${region.code} · ${region.name}` : regionCode(snapshot, section.regionId);
          return (
            <Fragment key={section.regionId}>
              <SectionRow label={label} colSpan={5} />
              {section.rows.map((row) => {
                const unit = unitFor(snapshot, row.productId);
                return (
                  <TableRow key={`${section.regionId}:${row.productId}`}>
                    <TableCell className={IDENTITY_CELL}>
                      <ProductIdentity snapshot={snapshot} productId={row.productId} />
                    </TableCell>
                    <TableCell className={QUANTITY_CELL}>
                      <StockQty quantity={row.warehouses} unit={unit} />
                    </TableCell>
                    <TableCell className={QUANTITY_CELL}>
                      <StockQty quantity={row.production} unit={unit} />
                    </TableCell>
                    <TableCell className={QUANTITY_CELL}>
                      <StockQty quantity={row.transfers} unit={unit} />
                    </TableCell>
                    <TableCell className={QUANTITY_CELL}>
                      <StockQty quantity={row.regionReserve} unit={unit} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </Fragment>
          );
        })
      )}
    </TableBody>
  </Table>
);

export const StockProductsMatrix = ({
  snapshot,
  group,
  productRows,
  warehouseSections,
  regionSections,
  empty,
}: {
  snapshot: LogisticsSnapshot;
  group: StockGroup;
  productRows: StockProductMatrixRow[];
  warehouseSections: StockWarehouseSection[];
  regionSections: StockRegionSection[];
  empty: string;
}) => {
  const title =
    group === "products" ? "Товары" : group === "warehouses" ? "Склады" : "Регионы";
  const count =
    group === "products"
      ? productRows.length
      : group === "warehouses"
        ? warehouseSections.reduce((sum, section) => sum + section.rows.length, 0)
        : regionSections.reduce((sum, section) => sum + section.rows.length, 0);
  return (
    <Card size="sm" className={logisticsCardClass}>
      <div className="px-3">
        <h2 className="text-sm font-semibold">
          {title}
          {count > 0 ? <span className="font-normal text-muted-foreground"> · {count}</span> : null}
        </h2>
      </div>
      <CardContent className="px-0">
        {group === "products" ? (
          <ProductsMatrixTable snapshot={snapshot} rows={productRows} empty={empty} />
        ) : group === "warehouses" ? (
          <WarehousesMatrixTable snapshot={snapshot} sections={warehouseSections} empty={empty} />
        ) : (
          <RegionsMatrixTable snapshot={snapshot} sections={regionSections} empty={empty} />
        )}
      </CardContent>
    </Card>
  );
};
