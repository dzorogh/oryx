"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { hrefForCustomerOrder } from "@/features/logistics/logistics-availability";
import { formatExpectedEnd, formatQuantity } from "@/features/logistics/logistics-labels";
import type { LogisticsListProductLine } from "@/features/logistics/logistics-list-types";
import { DocumentProductLines } from "@/features/logistics/ui/document-product-lines";
import { overdueDays } from "@/features/logistics/ui/document/document-meta-field";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { PlantLink } from "@/features/logistics/ui/plant-link";
import { DEADLINE_BUCKETS, deadlineGroupKey } from "./list-deadline";
import type { ListColumnDef, ListGroupDef } from "./list-types";
import { sumProductQuantities } from "./list-view-state";

export const ListQuantity = ({ value, tone = "default" }: { value: number; tone?: "default" | "warn" | "muted" }) => (
  <span
    className={
      value === 0 || tone === "muted"
        ? "text-muted-foreground/60"
        : tone === "warn"
          ? "font-semibold text-amber-600"
          : undefined
    }
  >
    {formatQuantity(value, "шт")}
  </span>
);

export const listNumberColumn = <TRow extends { number: string; sequenceNumber: string }>(
  href: (row: TRow) => string,
): ListColumnDef<TRow> => ({
  id: "number",
  label: "Номер",
  locked: true,
  sortType: "text",
  sortValue: (row) => row.number,
  render: (row) => <LogisticsCodeBadge code={row.number} href={href(row)} />,
});

export const listProductsColumn = <TRow extends { products: LogisticsListProductLine[] }>(
  options?: { minWidth?: string; renderExtra?: (line: LogisticsListProductLine) => ReactNode },
): ListColumnDef<TRow> => ({
  id: "products",
  label: "Товары",
  minWidth: options?.minWidth ?? "280px",
  render: (row) => (
    <DocumentProductLines
      lines={row.products}
      renderLineExtra={
        options?.renderExtra
          ? (line) => options.renderExtra!(line)
          : undefined
      }
    />
  ),
});

export const listCreatedColumn = <TRow extends { createdAt: string }>(): ListColumnDef<TRow> => ({
  id: "created",
  label: "Создан",
  sortType: "date",
  sortValue: (row) => row.createdAt,
  render: (row) => (
    <span className="text-xs text-muted-foreground">
      {new Date(row.createdAt).toLocaleDateString("ru-RU")}
    </span>
  ),
});

export const listAuthorColumn = <TRow extends { createdBy: string }>(): ListColumnDef<TRow> => ({
  id: "author",
  label: "Автор",
  defaultHidden: true,
  sortType: "text",
  sortValue: (row) => row.createdBy,
  render: (row) => row.createdBy || "—",
});

export const listQuantityColumn = <TRow extends { products: LogisticsListProductLine[] }>(
  label = "Кол-во",
): ListColumnDef<TRow> => ({
  id: "quantity",
  label,
  align: "right",
  sortType: "number",
  sortValue: (row) => sumProductQuantities(row.products),
  render: (row) => <ListQuantity value={sumProductQuantities(row.products)} />,
});

export const listDeadlineColumn = <TRow extends { expectedEndOn: string | null; status?: string }>(
  isOpen?: (status: string) => boolean,
): ListColumnDef<TRow> => ({
  id: "deadline",
  label: "Срок",
  sortType: "date",
  sortValue: (row) => row.expectedEndOn,
  render: (row) => {
    const overdue = row.status && isOpen?.(row.status) ? overdueDays(row.expectedEndOn) : 0;
    return (
      <span className="tabular-nums">
        {formatExpectedEnd(row.expectedEndOn)}
        {overdue > 0 ? (
          <span className="ml-1.5 inline-block rounded bg-destructive/10 px-1.5 py-0 text-[11px] font-medium text-destructive">
            просрочен {overdue} дн.
          </span>
        ) : null}
      </span>
    );
  },
});

export const listPlantColumn = <TRow extends { plantId: string }>(): ListColumnDef<TRow> => ({
  id: "plant",
  label: "Завод",
  sortType: "text",
  sortValue: (row) => row.plantId,
  render: (row) => (row.plantId ? <PlantLink plantId={row.plantId} /> : "—"),
});

export const listCustomerOrderLinkColumn = <TRow extends { customerOrderId: string; customerOrderNumber: string }>(
  label = "Заказ клиента",
): ListColumnDef<TRow> => ({
  id: "customerOrder",
  label,
  sortType: "text",
  sortValue: (row) => row.customerOrderNumber || row.customerOrderId,
  render: (row) =>
    row.customerOrderId ? (
      <LogisticsCodeBadge
        code={row.customerOrderNumber || row.customerOrderId}
        href={hrefForCustomerOrder(row.customerOrderId)}
      />
    ) : (
      "—"
    ),
});

export const catalogCodeColumn = <TRow extends { code: string; href: string }>(
  label = "Код",
): ListColumnDef<TRow> => ({
  id: "code",
  label,
  locked: true,
  sortType: "text",
  sortValue: (row) => row.code,
  render: (row) => <LogisticsCodeBadge code={row.code} href={row.href} />,
});

export const catalogNameColumn = <TRow extends { name: string; href: string }>(
  label = "Название",
): ListColumnDef<TRow> => ({
  id: "name",
  label,
  sortType: "text",
  sortValue: (row) => row.name,
  render: (row) => (
    <Link href={row.href} className="text-primary hover:underline">
      {row.name}
    </Link>
  ),
});

export const matchesProductSearch = (products: LogisticsListProductLine[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return products.some(
    (line) =>
      line.productId.toLowerCase().includes(normalized) ||
      (line.productName?.toLowerCase().includes(normalized) ?? false),
  );
};

export { deadlineFilterMatch } from "./list-deadline";

export const listDeadlineGroup = <TRow extends { expectedEndOn: string | null; status: string }>(
  isOpen: (status: string) => boolean,
): ListGroupDef<TRow> => ({
  id: "deadline",
  label: "Срок",
  order: [...DEADLINE_BUCKETS],
  key: (row) => deadlineGroupKey(row.expectedEndOn, isOpen(row.status)),
  renderHeader: (key) => key,
});
