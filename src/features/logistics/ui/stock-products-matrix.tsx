// english-ui:ignore-file
"use client";

import { Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatQuantity } from "@/features/logistics/logistics-labels";
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
import { FLUSH_TABLE_CLASS } from "@/features/logistics/ui/logistics-table-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ListCollapsedColumnHeader, ListColumnHeader } from "@/features/logistics/ui/list/list-column-header";
import { cn } from "@/lib/utils";

const QUANTITY_HEAD =
  "min-w-[4.5rem] px-3 pt-2 pb-2 text-right text-xs font-medium text-muted-foreground align-bottom";
const QUANTITY_CELL = "px-3 py-2 text-right text-sm";
const IDENTITY_HEAD =
  "sticky left-0 z-20 min-w-44 bg-card px-3 pt-2 pb-2 text-left text-xs font-medium align-bottom";
const IDENTITY_CELL = "sticky left-0 z-10 min-w-44 bg-card px-3 py-2";
const GROUP_HEAD =
  "border-l border-border/60 px-3 pt-2 pb-0 text-center text-xs font-medium tracking-[0.06em] text-muted-foreground/70 uppercase";

const OWNER_COLORS = {
  free: "#3f3f46",
  region: "#93b4fb",
  order: "#2563eb",
} as const;

const StockQty = ({ quantity, unit }: { quantity: number; unit?: string }) => (
  <span
    className={cn(
      "tabular-nums",
      quantity < 0 ? "text-destructive" : quantity === 0 ? "text-muted-foreground/50" : "font-medium text-foreground",
    )}
  >
    {formatQuantity(quantity, unit)}
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

export type StockMatrixGroupId = "owner" | "location" | "total";

export type StockMatrixColumnsView = {
  isVisible: (id: StockMatrixGroupId) => boolean;
  isCollapsed: (id: StockMatrixGroupId) => boolean;
  toggleCollapsed: (id: StockMatrixGroupId) => void;
  hide: (id: StockMatrixGroupId) => void;
  expandAll?: () => void;
};

const GROUP_LABELS: Record<StockMatrixGroupId, string> = {
  owner: "Закреплено за",
  location: "Место",
  total: "Всего",
};

const CollapsedHead = ({ id, columns }: { id: StockMatrixGroupId; columns: StockMatrixColumnsView }) => (
  <TableHead scope="col" rowSpan={2} className="border-l border-border/60 p-0 text-center align-middle" style={{ width: 28, minWidth: 28 }}>
    <ListCollapsedColumnHeader
      label={GROUP_LABELS[id]}
      onExpand={() => columns.toggleCollapsed(id)}
      onHide={() => columns.hide(id)}
      onExpandAll={columns.expandAll}
    />
  </TableHead>
);

const CollapsedCell = () => <TableCell className="border-l border-border/60 bg-muted/40 p-0" style={{ width: 28 }} aria-hidden />;

const GroupHead = ({
  id,
  colSpan,
  rowSpan,
  className,
  columns,
}: {
  id: StockMatrixGroupId;
  colSpan?: number;
  rowSpan?: number;
  className: string;
  columns: StockMatrixColumnsView;
}) => (
  <TableHead scope={colSpan ? "colgroup" : "col"} colSpan={colSpan} rowSpan={rowSpan} className={className}>
    <ListColumnHeader
      label={GROUP_LABELS[id]}
      align={id === "total" ? "right" : "left"}
      onCollapse={() => columns.toggleCollapsed(id)}
      onHide={() => columns.hide(id)}
      onExpandAll={columns.expandAll}
    />
  </TableHead>
);

const ProductsMatrixTable = ({
  snapshot,
  rows,
  empty,
  columns,
}: {
  snapshot: LogisticsSnapshot;
  rows: StockProductMatrixRow[];
  empty: string;
  columns: StockMatrixColumnsView;
}) => {
  const show = (id: StockMatrixGroupId) => columns.isVisible(id) && !columns.isCollapsed(id);
  const collapsed = (id: StockMatrixGroupId) => columns.isVisible(id) && columns.isCollapsed(id);
  const colSpan =
    1 +
    (["owner", "location"] as const).reduce((sum, id) => sum + (show(id) ? 3 : collapsed(id) ? 1 : 0), 0) +
    (columns.isVisible("total") ? 1 : 0);
  const hasSubHeader = show("owner") || show("location");

  return (
    <TooltipProvider delay={0}>
      <Table className="w-max min-w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" rowSpan={hasSubHeader ? 2 : 1} className={IDENTITY_HEAD}>
              Товар
            </TableHead>
            {(["owner", "location"] as const).map((id) =>
              show(id) ? (
                <GroupHead key={id} id={id} colSpan={3} className={GROUP_HEAD} columns={columns} />
              ) : collapsed(id) ? (
                <CollapsedHead key={id} id={id} columns={columns} />
              ) : null,
            )}
            {show("total") ? (
              <GroupHead
                id="total"
                rowSpan={hasSubHeader ? 2 : 1}
                className={cn(QUANTITY_HEAD, "border-l border-border/60 bg-[#fcfcfc]")}
                columns={columns}
              />
            ) : collapsed("total") ? (
              <CollapsedHead id="total" columns={columns} />
            ) : null}
          </TableRow>
          {hasSubHeader ? (
            <TableRow className="hover:bg-transparent">
              {show("owner") ? (
                <>
                  <TableHead scope="col" className={cn(QUANTITY_HEAD, "border-l border-border/60 bg-[#f7f7f8]")}>
                    <span
                      className="mr-1.5 inline-block size-2 rounded-sm align-middle"
                      style={{ background: OWNER_COLORS.free }}
                      aria-hidden
                    />
                    Свободно
                  </TableHead>
                  <TableHead scope="col" className={cn(QUANTITY_HEAD, "bg-[#f4f7ff]")}>
                    <span
                      className="mr-1.5 inline-block size-2 rounded-sm align-middle"
                      style={{ background: OWNER_COLORS.region }}
                      aria-hidden
                    />
                    Резерв региона
                  </TableHead>
                  <TableHead scope="col" className={cn(QUANTITY_HEAD, "bg-[#eef3fe]")}>
                    <span
                      className="mr-1.5 inline-block size-2 rounded-sm align-middle"
                      style={{ background: OWNER_COLORS.order }}
                      aria-hidden
                    />
                    Резерв заказа
                  </TableHead>
                </>
              ) : null}
              {show("location") ? (
                <>
                  <TableHead scope="col" className={cn(QUANTITY_HEAD, "border-l border-border/60")}>
                    Склады
                  </TableHead>
                  <TableHead scope="col" className={QUANTITY_HEAD}>
                    Производство
                  </TableHead>
                  <TableHead scope="col" className={QUANTITY_HEAD}>
                    Перемещения
                  </TableHead>
                </>
              ) : null}
            </TableRow>
          ) : null}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <MatrixEmpty colSpan={colSpan} message={empty} />
          ) : (
            rows.map((row) => {
              const unit = unitFor(snapshot, row.productId);
              const total = row.location.warehouses + row.location.production + row.location.transfers;
              const ownerTotal = row.owner.free + row.owner.regionReserve + row.owner.orderReserve || 1;
              return (
                <TableRow key={row.productId} className="hover:bg-muted/40">
                  <TableCell className={IDENTITY_CELL}>
                    <ProductIdentity snapshot={snapshot} productId={row.productId} />
                  </TableCell>
                  {show("owner") ? (
                    <>
                      <TableCell className={cn(QUANTITY_CELL, "border-l border-border/60 bg-[#f7f7f8]")}>
                        <StockQty quantity={row.owner.free} unit={unit} />
                      </TableCell>
                      <TableCell className={cn(QUANTITY_CELL, "bg-[#f4f7ff]")}>
                        <StockQty quantity={row.owner.regionReserve} unit={unit} />
                      </TableCell>
                      <TableCell className={cn(QUANTITY_CELL, "bg-[#eef3fe]")}>
                        <StockQty quantity={row.owner.orderReserve} unit={unit} />
                      </TableCell>
                    </>
                  ) : collapsed("owner") ? (
                    <CollapsedCell />
                  ) : null}
                  {show("location") ? (
                    <>
                      <TableCell className={cn(QUANTITY_CELL, "border-l border-border/60")}>
                        <StockQty quantity={row.location.warehouses} unit={unit} />
                      </TableCell>
                      <TableCell className={QUANTITY_CELL}>
                        <StockQty quantity={row.location.production} unit={unit} />
                      </TableCell>
                      <TableCell className={QUANTITY_CELL}>
                        <StockQty quantity={row.location.transfers} unit={unit} />
                      </TableCell>
                    </>
                  ) : collapsed("location") ? (
                    <CollapsedCell />
                  ) : null}
                  {show("total") ? (
                    <TableCell className={cn(QUANTITY_CELL, "border-l border-border/60 bg-[#fcfcfc]")}>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums">{formatQuantity(total, unit)}</span>
                        <span className="flex h-1 w-[84px] overflow-hidden rounded-full bg-muted" aria-hidden>
                          <i
                            className="block h-full"
                            style={{ width: `${(row.owner.free / ownerTotal) * 100}%`, background: OWNER_COLORS.free }}
                          />
                          <i
                            className="block h-full"
                            style={{
                              width: `${(row.owner.regionReserve / ownerTotal) * 100}%`,
                              background: OWNER_COLORS.region,
                            }}
                          />
                          <i
                            className="block h-full"
                            style={{
                              width: `${(row.owner.orderReserve / ownerTotal) * 100}%`,
                              background: OWNER_COLORS.order,
                            }}
                          />
                        </span>
                      </div>
                    </TableCell>
                  ) : collapsed("total") ? (
                    <CollapsedCell />
                  ) : null}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
};

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
  columns,
}: {
  snapshot: LogisticsSnapshot;
  columns: StockMatrixColumnsView;
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
    <Card
      size="sm"
      className={cn(logisticsCardClass, "gap-0 overflow-hidden py-0 data-[size=sm]:gap-0 data-[size=sm]:py-0")}
    >
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">
          {title}
          {count > 0 ? <span className="font-normal text-muted-foreground"> · {count}</span> : null}
        </h2>
      </div>
      <CardContent className={cn("overflow-x-auto px-0 group-data-[size=sm]/card:px-0", FLUSH_TABLE_CLASS)}>
        {group === "products" ? (
          <ProductsMatrixTable snapshot={snapshot} rows={productRows} empty={empty} columns={columns} />
        ) : group === "warehouses" ? (
          <WarehousesMatrixTable snapshot={snapshot} sections={warehouseSections} empty={empty} />
        ) : (
          <RegionsMatrixTable snapshot={snapshot} sections={regionSections} empty={empty} />
        )}
      </CardContent>
    </Card>
  );
};
