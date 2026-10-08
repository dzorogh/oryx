"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { loadReservationList } from "@/features/logistics/logistics-api";
import { projectDocumentCancelGuidance } from "@/features/logistics/logistics-cancel-guidance";
import { DocumentCancelControl } from "@/features/logistics/ui/document-cancel-guidance";
import { hrefForOwner } from "@/features/logistics/logistics-availability";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReservationCatalogDialog } from "@/features/logistics/ui/reservation-catalog-dialog";
import {
  FREE_OWNER_LABEL,
  LEDGER_ASSIGNED_TO_KIND_LABELS,
  OWNER_TYPE_LABELS,
  RESERVATION_DIRECTION_LABELS,
  formatMetaTimestamp,
  formatQuantity,
  locationKindLabel,
} from "@/features/logistics/logistics-labels";
import { ownerLabel, productById } from "@/features/logistics/logistics-lookups";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import {
  reservationColumns,
  reservationGroupDefs,
  reservationSortDefs,
} from "@/features/logistics/ui/list/document-list-configs";
import { LogisticsListPageContent } from "@/features/logistics/ui/list/logistics-list-page-content";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { matchesProductSearch } from "@/features/logistics/ui/list/list-helpers";
import type { ListFilterDef } from "@/features/logistics/ui/list/list-filters";
import {
  authorFilter,
  createdFilter,
  lineCountFilter,
  productFilter,
  quantityFilter,
} from "@/features/logistics/ui/list/list-filter-defs";
import type { ReservationListRow } from "@/features/logistics/logistics-list-types";
import { holdOwnerBadge, holdPlace } from "@/features/logistics/ui/reservation-hold-list";
import {
  isFreeOwner,
  matchDocumentParam,
  reservationDirection,
  type OwnerType,
  type ReservationDirection,
} from "@/features/logistics/logistics-types";
import { buildDocumentTimeline } from "@/features/logistics/document-timeline";
import { DocumentHeader } from "@/features/logistics/ui/document/document-header";
import { DocumentHistory } from "@/features/logistics/ui/document/document-history";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { DocumentTabs } from "@/features/logistics/ui/document/document-tabs";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { StatusPill } from "@/features/logistics/ui/status-badge";
import { useLogisticsList, useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { Lock } from "lucide-react";

const RESERVATION_TOGGLE = [
  { value: "all", label: "Все" },
  { value: "reserve", label: RESERVATION_DIRECTION_LABELS.reserve },
  { value: "release", label: RESERVATION_DIRECTION_LABELS.release },
  { value: "reassign", label: RESERVATION_DIRECTION_LABELS.reassign },
];

const parseDirectionFilter = (value: string | null): "all" | ReservationDirection =>
  value === "reserve" || value === "release" || value === "reassign" ? value : "all";

const FREE_KEY = "free";

const ownerKey = (ownerType: OwnerType | null, ownerId: string | null) =>
  isFreeOwner(ownerType, ownerId) ? FREE_KEY : `${ownerType}:${ownerId}`;

const ownerKindKey = (ownerType: OwnerType | null, ownerId: string | null): OwnerType | "free" =>
  isFreeOwner(ownerType, ownerId) || !ownerType ? "free" : ownerType;

const OWNER_KIND_OPTIONS = (["free", "order", "region"] as const).map((value) => ({
  value,
  label: LEDGER_ASSIGNED_TO_KIND_LABELS[value],
}));

const RESERVATION_ORIGIN_LABELS: Record<string, string> = {
  manual: "Вручную",
  customer_order_close: "Закрытие заказа клиента",
  production_order_close: "Закрытие заказа на производство",
};

const reservationFilters: ListFilterDef<ReservationListRow>[] = [
  {
    kind: "multi",
    id: "place",
    label: "Место",
    placeholder: "Место",
    quick: true,
    searchable: true,
    values: (row) => `${row.locationType}:${row.locationId}`,
    optionLabel: (_value, row) => holdPlace(row).label,
  },
  {
    kind: "multi",
    id: "destination",
    label: "Назначение",
    placeholder: "Назначение",
    quick: true,
    searchable: true,
    options: [{ value: FREE_KEY, label: FREE_OWNER_LABEL }],
    values: (row) => ownerKey(row.toOwnerType, row.toOwnerId),
    optionLabel: (_value, row) => holdOwnerBadge(row.toOwnerType, row.toOwnerId, row.toOwnerNumber).label,
  },
  productFilter<ReservationListRow>((row) => row.lines),
  {
    kind: "multi",
    id: "placeKind",
    label: "Тип места",
    options: [
      { value: "warehouse", label: locationKindLabel("warehouse") },
      { value: "plant_warehouse", label: locationKindLabel("warehouse", true) },
      { value: "production_order", label: locationKindLabel("production_order") },
      { value: "transfer", label: locationKindLabel("transfer") },
    ],
    values: (row) =>
      row.locationType === "warehouse" && row.locationIsPlantWarehouse ? "plant_warehouse" : row.locationType,
  },
  {
    kind: "multi",
    id: "destinationKind",
    label: "Тип назначения",
    options: OWNER_KIND_OPTIONS,
    values: (row) => ownerKindKey(row.toOwnerType, row.toOwnerId),
  },
  {
    kind: "multi",
    id: "source",
    label: "Источник",
    searchable: true,
    options: [{ value: FREE_KEY, label: FREE_OWNER_LABEL }],
    values: (row) => row.lines.map((line) => ownerKey(line.fromOwnerType, line.fromOwnerId)),
    optionLabel: (value, row) => {
      const line = row.lines.find((item) => ownerKey(item.fromOwnerType, item.fromOwnerId) === value);
      return line ? holdOwnerBadge(line.fromOwnerType, line.fromOwnerId, line.fromOwnerNumber).label : value;
    },
  },
  {
    kind: "multi",
    id: "sourceKind",
    label: "Тип источника",
    options: OWNER_KIND_OPTIONS,
    values: (row) => row.lines.map((line) => ownerKindKey(line.fromOwnerType, line.fromOwnerId)),
  },
  {
    kind: "multi",
    id: "operation",
    label: "Операция",
    options: (["reserve", "release", "reassign"] as const).map((value) => ({
      value,
      label: RESERVATION_DIRECTION_LABELS[value],
    })),
    values: (row) => row.direction,
  },
  {
    kind: "multi",
    id: "origin",
    label: "Как создан",
    options: Object.entries(RESERVATION_ORIGIN_LABELS).map(([value, label]) => ({ value, label })),
    values: (row) => row.creationSource || "manual",
  },
  createdFilter<ReservationListRow>(),
  authorFilter<ReservationListRow>(),
  quantityFilter<ReservationListRow>((row) => row.lines),
  lineCountFilter<ReservationListRow>((row) => row.lines),
];

export const ReservationsPage = () => {
  const { rows, isLoading, error, reload } = useLogisticsList(loadReservationList);
  const searchParams = useSearchParams();
  const [direction, setDirection] = useState<"all" | ReservationDirection>(
    parseDirectionFilter(searchParams.get("operation")),
  );
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [reserveDirection, setReserveDirection] = useState<ReservationDirection>("reserve");
  const formStore = useLogisticsStore({ kind: "form", form: "reservation", enabled: open });

  const visible = useMemo(
    () =>
      rows.filter((item) => {
        if (direction !== "all" && item.direction !== direction) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const products = item.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            productName: line.productName,
          }));
          if (
            !item.number.toLowerCase().includes(q) &&
            !item.description.toLowerCase().includes(q) &&
            !(item.toOwnerNumber ?? "").toLowerCase().includes(q) &&
            !(item.locationNumber ?? "").toLowerCase().includes(q) &&
            !matchesProductSearch(products, q)
          ) {
            return false;
          }
        }
        return true;
      }),
    [direction, rows, search],
  );

  return (
    <LogisticsPageShell crumbs={[{ label: "Резервы" }]}>
      <LogisticsListPageContent
        listId="reservations"
        title="Резервы"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm">Новый резерв</Button>} />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setReserveDirection("reserve"); setOpen(true); }}>
                Зарезервировать из свободного
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setReserveDirection("release"); setOpen(true); }}>
                Снять резерв
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setReserveDirection("reassign"); setOpen(true); }}>
                Передать между владельцами
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        columns={reservationColumns}
        sortDefs={reservationSortDefs}
        groupDefs={reservationGroupDefs}
        rows={visible}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        toggleOptions={RESERVATION_TOGGLE}
        toggleValue={direction}
        onToggleChange={(value) => setDirection(value as "all" | ReservationDirection)}
        toggleAriaLabel="Операция резерва"
        search={{ value: search, onChange: setSearch, placeholder: "Поиск: номер, заказ, товар" }}
        filters={reservationFilters}
        hasActiveFilters={search.trim().length > 0}
        onResetFilters={() => setSearch("")}
      />
      <ReservationCatalogDialog
        snapshot={formStore.snapshot}
        balances={formStore.balances}
        loading={formStore.isLoading}
        loadError={formStore.error}
        open={open}
        onOpenChange={setOpen}
        direction={reserveDirection}
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
  const [followUpOpen, setFollowUpOpen] = useState(false);
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
    mode: "posted",
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
        description={doc.description || doc.note || undefined}
        actions={
          <DocumentCancelControl
            kicker={doc.number}
            guidance={cancelGuidance}
            reload={reload}
            onFollowUp={(action) => {
              if (action.id === "open-reservation") {
                setFollowUpOpen(true);
              }
            }}
          />
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
              <DocumentSection title="Товары">
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
      {followUpOpen ? (
        <ReservationCatalogDialog
          snapshot={followUpForm.snapshot}
          balances={followUpForm.balances}
          loading={followUpForm.isLoading}
          loadError={followUpForm.error}
          open
          onOpenChange={setFollowUpOpen}
          preset={cancelGuidance.reservationPreset}
        />
      ) : null}
    </LogisticsPageShell>
  );
};
