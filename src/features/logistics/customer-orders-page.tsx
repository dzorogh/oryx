// english-ui:ignore-file
"use client";

import { ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ALL_VALUE } from "@/components/store/pim/products/catalog/catalog-helpers";
import { CatalogQuickSelectControl } from "@/components/store/pim/products/catalog/catalog-filters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import {
  closeCustomerOrder,
  createCustomerOrder,
  loadCustomerOrderList,
  setOrderLineQuantity,
  updateExpectedEnd,
} from "@/features/logistics/logistics-api";
import { projectDocumentCancelGuidance } from "@/features/logistics/logistics-cancel-guidance";
import { nextOrderLineQuantity } from "@/features/logistics/logistics-rules";
import { DocumentCancelControl } from "@/features/logistics/ui/document-cancel-guidance";
import { sumFreeForProduct } from "@/features/logistics/logistics-availability";
import { ReservationForm, ShipmentForm } from "@/features/logistics/logistics-forms";
import {
  OutputFromOrderForm,
  ProductionFromOrderForm,
  ReserveOnProductionForm,
  ReserveOnTransferForm,
  TransferReservedForm,
} from "@/features/logistics/order-action-forms";
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  formatExpectedEnd,
  formatQuantity,
  formatMetaTimestamp,
} from "@/features/logistics/logistics-labels";
import { productById, productIdentityLabel } from "@/features/logistics/logistics-lookups";
import { DocumentProductLines } from "@/features/logistics/ui/document-product-lines";
import {
  relatedOutputsForOrder,
  relatedReservations,
  relatedReturnsForOrder,
  relatedShipments,
  relatedTransfersForOrder,
} from "@/features/logistics/logistics-related";
import {
  calculateOrderDocumentCoverage,
  withOrderCoverage,
} from "@/features/logistics/order-document-coverage";
import {
  documentKey,
  documentKeysForAssignedEntity,
  matchDocumentParam,
  type CustomerOrderLine,
  type CustomerOrderStatus,
  type LocationType,
  type StockTransaction,
} from "@/features/logistics/logistics-types";
import type { CustomerOrderListRow } from "@/features/logistics/logistics-list-types";
import { buildDocumentTimeline, documentCompletedAt } from "@/features/logistics/document-timeline";
import { sumShippedForLine, sumShippedForOrderProduct } from "@/features/logistics/logistics-balances";
import { CustomerOrderLinesTable } from "@/features/logistics/ui/customer-order-lines-table";
import { OrderLineDialog, type OrderLineDialogMode } from "@/features/logistics/ui/order-line-dialog";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";
import { OutputReleaseDialog, type OutputReleaseTarget } from "@/features/logistics/ui/output-release-dialog";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { DocumentHeader } from "@/features/logistics/ui/document/document-header";
import { DocumentHistory } from "@/features/logistics/ui/document/document-history";
import {
  DocumentMetaDateInput,
  DocumentMetaEmpty,
  pluralPositions,
  overdueDays,
} from "@/features/logistics/ui/document/document-meta-field";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { DocumentTabs } from "@/features/logistics/ui/document/document-tabs";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import {
  deadlineFilterMatch,
  listAuthorColumn,
  listCreatedColumn,
  listDeadlineColumn,
  listDeadlineGroup,
  listNumberColumn,
  listProductsColumn,
  ListQuantity,
  matchesProductSearch,
} from "@/features/logistics/ui/list/list-helpers";
import type { ListColumnDef, ListGroupDef, ListSortDef } from "@/features/logistics/ui/list/list-types";
import { LogisticsListPageContent } from "@/features/logistics/ui/list/logistics-list-page-content";
import { OrderProgressTracker } from "@/features/logistics/ui/order-progress-tracker";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { CustomerOrderStatusBadge, StatusPill } from "@/features/logistics/ui/status-badge";
import { useLogisticsList, useLogisticsStore } from "@/features/logistics/use-logistics-store";

const STATUS_TOGGLE = [
  { value: "all", label: "Все" },
  { value: "in_progress", label: "Открыт" },
  { value: "done", label: "Закрыт" },
] as const;

const isOpenCustomerOrderStatus = (status: string) =>
  status === "open" || status === "in_progress";

const customerOrderColumns: ListColumnDef<CustomerOrderListRow>[] = [
  listNumberColumn((row) => `/store/logistics/customer-orders/${row.sequenceNumber}`),
  {
    id: "status",
    label: "Статус",
    sortType: "text",
    sortValue: (row) => row.status,
    render: (row) => <CustomerOrderStatusBadge status={row.status} />,
  },
  listProductsColumn<CustomerOrderListRow>(),
  {
    id: "ordered",
    label: "Заказано",
    align: "right",
    sortType: "number",
    sortValue: (row) => row.ordered,
    render: (row) => <ListQuantity value={row.ordered} />,
  },
  {
    id: "shipped",
    label: "Отгружено",
    align: "right",
    description: "Отгружено клиенту за вычетом возвратов",
    sortType: "number",
    sortValue: (row) => row.shipped,
    render: (row) => <ListQuantity value={row.shipped} />,
  },
  {
    id: "reserved",
    label: "В резерве",
    align: "right",
    description: "Закреплено за заказом на складах, в производстве и в пути",
    sortType: "number",
    sortValue: (row) => row.reserved,
    render: (row) => <ListQuantity value={row.reserved} />,
  },
  {
    id: "unfulfilled",
    label: "Не обеспечено",
    align: "right",
    description: "Заказано − отгружено − в резерве, по каждой строке. Под это количество пока нечего отгрузить.",
    sortType: "number",
    sortValue: (row) => (isOpenCustomerOrderStatus(row.status) ? row.openToReserve : null),
    render: (row) =>
      isOpenCustomerOrderStatus(row.status) ? (
        <ListQuantity value={row.openToReserve} tone="warn" />
      ) : (
        <span className="text-muted-foreground/60">—</span>
      ),
  },
  listDeadlineColumn<CustomerOrderListRow>(isOpenCustomerOrderStatus),
  listCreatedColumn<CustomerOrderListRow>(),
  {
    id: "description",
    label: "Описание",
    defaultHidden: true,
    sortType: "text",
    sortValue: (row) => row.description,
    render: (row) => row.description || "—",
  },
  listAuthorColumn<CustomerOrderListRow>(),
];

const customerOrderSortDefs: ListSortDef<CustomerOrderListRow>[] = [
  { id: "created", label: "Дата создания", type: "date", value: (row) => row.createdAt },
  { id: "deadline", label: "Срок", type: "date", value: (row) => row.expectedEndOn },
  { id: "number", label: "Номер", type: "text", value: (row) => row.number },
  { id: "unfulfilled", label: "Не обеспечено", type: "number", value: (row) => (isOpenCustomerOrderStatus(row.status) ? row.openToReserve : null) },
];

const customerOrderGroupDefs: ListGroupDef<CustomerOrderListRow>[] = [
  {
    id: "status",
    label: "Статус",
    key: (row) => row.status,
    renderHeader: (key) => CUSTOMER_ORDER_STATUS_LABELS[key as CustomerOrderStatus] ?? key,
  },
  listDeadlineGroup<CustomerOrderListRow>(isOpenCustomerOrderStatus),
  {
    id: "author",
    label: "Автор",
    key: (row) => row.createdBy || "—",
    renderHeader: (key) => key,
  },
];

const CustomerOrderCreateDialog = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) => {
  const { snapshot, balances, isLoading, error } = useLogisticsStore({
    kind: "form",
    form: "customer_order",
    enabled: open,
  });
  const [lines, setLines] = useState<Array<{ productId: string; quantity: string }>>([
    { productId: "", quantity: "1" },
  ]);
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [description, setDescription] = useState("");

  const productItems = snapshot.products.map((product) => ({
    value: product.id,
    label: productIdentityLabel(
      product,
      product.id,
      `свободно ${formatQuantity(sumFreeForProduct(balances, product.id), product.unit)}`,
    ),
  }));

  const createOrder = async () => {
    const validLines = lines.filter((line) => line.productId && Number(line.quantity) > 0);
    if (validLines.length === 0) {
      toast.error("Добавьте хотя бы одну строку с товаром и количеством");
      return;
    }
    const ok = await runLogisticsAction(
      async () => {
        await createCustomerOrder({
          regionId: snapshot.regions[0]?.id,
          description: description.trim(),
          expectedEndOn: expectedEndOn || null,
          lines: validLines.map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity),
          })),
        });
      },
      "Заказ клиента создан",
      onCreated,
    );
    if (ok) {
      onOpenChange(false);
      setExpectedEndOn("");
      setDescription("");
      setLines([{ productId: "", quantity: "1" }]);
    }
  };

  return (
    <LogisticsDialog open={open} onOpenChange={onOpenChange} title="Новый заказ клиента">
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <div className="flex flex-col gap-3">
          <ExpectedEndField value={expectedEndOn} onChange={setExpectedEndOn} />
          <label className="space-y-1 text-sm">
            <span className="font-medium">Описание</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Необязательный комментарий"
            />
          </label>
          {lines.map((line, index) => (
            <div key={`line-${index}`} className="space-y-2">
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <FieldSelect
                  label={index === 0 ? "Товар" : `Товар ${index + 1}`}
                  value={line.productId}
                  items={productItems}
                  onChange={(value) => {
                    setLines((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, productId: value } : item,
                      ),
                    );
                  }}
                />
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Кол-во</span>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, quantity: value } : item,
                        ),
                      );
                    }}
                    aria-label={`Количество ${index + 1}`}
                  />
                </label>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((current) => [...current, { productId: "", quantity: "1" }])}
          >
            Добавить строку
          </Button>
          <Button type="button" onClick={() => void createOrder()}>
            Создать заказ клиента
          </Button>
        </div>
      ) : null}
    </LogisticsDialog>
  );
};

export const CustomerOrdersPage = () => {
  const { rows, isLoading, error, reload } = useLogisticsList(loadCustomerOrderList);
  const [open, setOpen] = useState(false);
  const [statusToggle, setStatusToggle] = useState<(typeof STATUS_TOGGLE)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState(ALL_VALUE);
  const [deadlineFilter, setDeadlineFilter] = useState<"all" | "overdue" | "week" | "none">("all");
  const [hasUnfulfilled, setHasUnfulfilled] = useState(false);
  const [author, setAuthor] = useState(ALL_VALUE);

  const productOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const line of rows.flatMap((row) => row.products)) {
      if (line.productId && !names.has(line.productId)) {
        names.set(line.productId, line.productName ?? line.productId);
      }
    }
    return [...names]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "ru"));
  }, [rows]);

  const authorOptions = useMemo(
    () =>
      [...new Set(rows.map((row) => row.createdBy).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((name) => ({ value: name, label: name })),
    [rows],
  );

  const hasActiveFilters =
    search.trim().length > 0 ||
    productId !== ALL_VALUE ||
    deadlineFilter !== "all" ||
    hasUnfulfilled ||
    author !== ALL_VALUE;

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rows.filter((order) => {
      if (statusToggle === "in_progress" && !isOpenCustomerOrderStatus(order.status)) {
        return false;
      }
      if (statusToggle === "done" && order.status !== "done" && order.status !== "closed") {
        return false;
      }
      if (
        normalizedSearch &&
        !order.number.toLowerCase().includes(normalizedSearch) &&
        !order.description.toLowerCase().includes(normalizedSearch) &&
        !matchesProductSearch(order.products, normalizedSearch)
      ) {
        return false;
      }
      if (productId !== ALL_VALUE && !order.products.some((line) => line.productId === productId)) {
        return false;
      }
      if (!deadlineFilterMatch(order.expectedEndOn, deadlineFilter, isOpenCustomerOrderStatus(order.status))) {
        return false;
      }
      if (hasUnfulfilled && !(isOpenCustomerOrderStatus(order.status) && order.openToReserve > 0)) {
        return false;
      }
      return author === ALL_VALUE || order.createdBy === author;
    });
  }, [author, deadlineFilter, hasUnfulfilled, productId, rows, search, statusToggle]);

  const resetFilters = () => {
    setSearch("");
    setProductId(ALL_VALUE);
    setDeadlineFilter("all");
    setHasUnfulfilled(false);
    setAuthor(ALL_VALUE);
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Заказы клиента" }]}>
      <LogisticsListPageContent
        listId="customer-orders"
        title="Заказы клиента"
        actionLabel="Новый заказ клиента"
        onAction={() => setOpen(true)}
        columns={customerOrderColumns}
        sortDefs={customerOrderSortDefs}
        groupDefs={customerOrderGroupDefs}
        rows={filtered}
        rowKey={(row) => row.id}
        groupQuantity={(row) => row.ordered}
        isLoading={isLoading}
        error={error}
        toggleOptions={[...STATUS_TOGGLE]}
        toggleValue={statusToggle}
        onToggleChange={(value) => setStatusToggle(value as (typeof STATUS_TOGGLE)[number]["value"])}
        toggleAriaLabel="Статус заказа клиента"
        search={{ value: search, onChange: setSearch }}
        quickControls={
          <CatalogQuickSelectControl
            value={productId}
            onValueChange={(value) => setProductId(value ?? ALL_VALUE)}
            ariaLabel="Быстрый фильтр по товару"
            placeholder="Товар"
            allLabel="Все товары"
            options={productOptions}
            widthClassName="w-[140px] shrink-0 lg:w-[176px]"
          />
        }
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        filterSheet={
          <>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Срок</span>
              <CatalogQuickSelectControl
                value={deadlineFilter}
                onValueChange={(value) => setDeadlineFilter((value ?? "all") as typeof deadlineFilter)}
                ariaLabel="Фильтр по сроку"
                placeholder="Любой срок"
                allLabel="Любой срок"
                options={[
                  { value: "overdue", label: "Просрочен" },
                  { value: "week", label: "Ближайшие 7 дней" },
                  { value: "none", label: "Без срока" },
                ]}
                widthClassName="w-full"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Автор</span>
              <CatalogQuickSelectControl
                value={author}
                onValueChange={(value) => setAuthor(value ?? ALL_VALUE)}
                ariaLabel="Фильтр по автору"
                placeholder="Все авторы"
                allLabel="Все авторы"
                options={authorOptions}
                widthClassName="w-full"
              />
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2.5">
              <Checkbox
                checked={hasUnfulfilled}
                onCheckedChange={(checked) => setHasUnfulfilled(checked === true)}
                aria-label="Только с необеспеченным количеством"
              />
              <span className="text-sm font-medium">Есть необеспеченное</span>
            </label>
          </>
        }
      />

      <CustomerOrderCreateDialog open={open} onOpenChange={setOpen} onCreated={reload} />
    </LogisticsPageShell>
  );
};

export const CustomerOrderDetailPage = () => {
  const params = useParams<{ orderId: string }>();
  const { snapshot, balances, isLoading, error, reload, found } = useLogisticsStore({
    kind: "document",
    documentKind: "customer_order",
    ref: String(params.orderId ?? ""),
  });
  const order = matchDocumentParam(snapshot.customerOrders, params.orderId);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [outputReleaseTarget, setOutputReleaseTarget] = useState<OutputReleaseTarget | null>(null);
  const [productionOpen, setProductionOpen] = useState(false);
  const [reserveOnProductionOpen, setReserveOnProductionOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [reserveOnTransferOpen, setReserveOnTransferOpen] = useState(false);
  const [reserveLine, setReserveLine] = useState<CustomerOrderLine | null>(null);
  const [releasePlace, setReleasePlace] = useState<{
    line: CustomerOrderLine;
    locationType: LocationType;
    locationId: string;
  } | null>(null);
  const [lineOpen, setLineOpen] = useState(false);
  const [lineMode, setLineMode] = useState<OrderLineDialogMode>("add");
  const [lineProductId, setLineProductId] = useState("");
  const [lineQuantity, setLineQuantity] = useState("1");
  const [linePending, setLinePending] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);

  const lines = useMemo(
    () => (order ? snapshot.customerOrderLines.filter((line) => line.orderId === order.id) : []),
    [order, snapshot.customerOrderLines],
  );

  if (isLoading) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Заказы клиента", href: "/store/logistics/customer-orders" }, { label: "Заказ клиента" }]}>
        <LogisticsLoading />
      </LogisticsPageShell>
    );
  }

  if (error) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Заказы клиента", href: "/store/logistics/customer-orders" }, { label: "Заказ клиента" }]}>
        <LogisticsError message={error} />
      </LogisticsPageShell>
    );
  }

  if (!order || !found) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Заказы клиента", href: "/store/logistics/customer-orders" }, { label: "Нет заказа клиента" }]}>
        <LogisticsError message="Заказ клиента не найден." />
      </LogisticsPageShell>
    );
  }

  const canAct = isOpenCustomerOrderStatus(order.status);
  const coverage = calculateOrderDocumentCoverage(snapshot, order.id);
  const cancelGuidance = projectDocumentCancelGuidance({ type: "customer_order", id: order.id }, snapshot, balances);
  const completedAt = documentCompletedAt(snapshot, order.id);
  const overdue = canAct ? overdueDays(order.expectedEndOn) : 0;
  const orderedQty = lines.reduce((sum, line) => sum + line.quantity, 0);
  const shippedQty = lines.reduce((sum, line) => sum + sumShippedForLine(balances, line), 0);
  const shipPct = orderedQty > 0 ? Math.min(100, Math.floor((shippedQty / orderedQty) * 100)) : 0;
  const movementFilter = (entry: StockTransaction) =>
    documentKeysForAssignedEntity(snapshot.transactions, "order", order.id).has(
      documentKey(entry.documentType, entry.documentId),
    );
  const movementCount = snapshot.transactions.filter(movementFilter).length;
  const historyEntries = buildDocumentTimeline(snapshot, {
    documentId: order.id,
    createdAt: order.createdAt,
    createdBy: order.createdBy,
    statusLabels: CUSTOMER_ORDER_STATUS_LABELS,
  });

  const primaryStages = [
    {
      id: "output",
      title: "Выпуск производства",
      href: "/store/logistics/outputs",
      items: withOrderCoverage(relatedOutputsForOrder(snapshot, order.id), coverage.output),
      doneStatuses: ["done"] as const,
      actions: canAct
        ? [
            { label: "Новый заказ на производство", onClick: () => setProductionOpen(true) },
            { label: "Выпустить", onClick: () => setOutputOpen(true) },
            { label: "Зарезервировать в выпуске", onClick: () => setReserveOnProductionOpen(true) },
          ]
        : undefined,
    },
    {
      id: "transfer",
      title: "Перемещения",
      href: "/store/logistics/transfers",
      items: withOrderCoverage(relatedTransfersForOrder(snapshot, order.id), coverage.transfer),
      doneStatuses: ["delivered"] as const,
      actions: canAct
        ? [
            { label: "Переместить занятое", onClick: () => setTransferOpen(true) },
            { label: "Зарезервировать в пути", onClick: () => setReserveOnTransferOpen(true) },
          ]
        : undefined,
    },
    {
      id: "shipment",
      title: "Отгрузки",
      href: "/store/logistics/shipments",
      items: withOrderCoverage(relatedShipments(snapshot, order.id), coverage.shipment),
      doneStatuses: ["posted"] as const,
      actions: canAct ? [{ label: "Отгрузить", onClick: () => setShipOpen(true) }] : undefined,
    },
  ];

  const secondaryStages = [
    {
      id: "reservations",
      title: "Резервы",
      href: "/store/logistics/reservations",
      items: withOrderCoverage(relatedReservations(snapshot, order.id), coverage.reservation),
      doneStatuses: ["posted"] as const,
      actions: canAct
        ? [
            {
              label: "Зарезервировать",
              onClick: () => {
                setReserveLine(null);
                setReserveOpen(true);
              },
            },
          ]
        : undefined,
    },
    {
      id: "returns",
      title: "Возвраты",
      href: "/store/logistics/shipments?direction=return",
      items: withOrderCoverage(relatedReturnsForOrder(snapshot, order.id), coverage.return),
      doneStatuses: ["posted"] as const,
    },
  ];

  return (
    <LogisticsPageShell crumbs={[{ label: "Заказы клиента", href: "/store/logistics/customer-orders" }, { label: order.number }]}>
      <DocumentHeader
        kind="Заказ клиента"
        icon={ShoppingCart}
        number={order.number}
        status={<CustomerOrderStatusBadge status={order.status} />}
        description={order.description || null}
        actions={
          <>
            <DocumentCancelControl
              guidance={cancelGuidance}
              reload={reload}
              onFollowUp={(action) => {
                if (action.id === "close-customer-order") {
                  void runLogisticsAction(
                    () => closeCustomerOrder(order.id),
                    "Открытые резервы сняты, заказ клиента закрыт",
                    reload,
                  );
                }
              }}
            />
            {canAct ? (
              <Button
                type="button"
                onClick={() => {
                  void runLogisticsAction(
                    () => closeCustomerOrder(order.id),
                    "Открытые резервы сняты, заказ клиента закрыт",
                    reload,
                  );
                }}
              >
                Закрыть заказ клиента
              </Button>
            ) : null}
          </>
        }
        meta={[
          { label: "Создан", value: formatMetaTimestamp(order.createdAt) },
          {
            label: "Ожидаемое окончание",
            value: (
              <DocumentMetaDateInput
                value={order.expectedEndOn ?? ""}
                aria-label="Ожидаемое окончание"
                overdueDays={overdue}
                onChange={(value) => {
                  void runLogisticsAction(
                    () => updateExpectedEnd(order.id, value || null),
                    "Срок заказа клиента обновлён",
                    reload,
                  );
                }}
              />
            ),
          },
          {
            label: "Завершён",
            value: completedAt ? formatMetaTimestamp(completedAt) : <DocumentMetaEmpty />,
          },
          {
            label: "Товаров",
            value: (
              <span>
                {pluralPositions(lines.length)}{" "}
                <small className="font-normal text-muted-foreground">· {formatQuantity(orderedQty)} шт</small>
              </span>
            ),
          },
          {
            label: "Отгружено",
            value: (
              <span>
                {formatQuantity(shippedQty)} из {formatQuantity(orderedQty)} шт{" "}
                <small className="font-normal text-muted-foreground">· {shipPct}%</small>
              </span>
            ),
          },
        ]}
      />

      <OrderProgressTracker canAct={canAct} primaryStages={primaryStages} secondaryStages={secondaryStages} />

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
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setLineMode("add");
                        setLineProductId("");
                        setLineQuantity("1");
                        setLineError(null);
                        setLineOpen(true);
                      }}
                    >
                      Добавить товар
                    </Button>
                    {canAct ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReserveLine(null);
                            setReserveOpen(true);
                          }}
                        >
                          Зарезервировать
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setShipOpen(true)}>
                          Отгрузить
                        </Button>
                      </>
                    ) : null}
                  </>
                }
              >
                <CustomerOrderLinesTable
                  bare
                  snapshot={snapshot}
                  balances={balances}
                  lines={lines}
                  canAct={canAct}
                  onReserve={(line) => {
                    setReserveLine(line);
                    setReserveOpen(true);
                  }}
                  onShip={() => setShipOpen(true)}
                  onRelease={(place) => {
                    setReleasePlace(place);
                    setReleaseOpen(true);
                  }}
                  onReleaseOutput={(line, hold) =>
                    setOutputReleaseTarget({
                      outputId: hold.outputId,
                      outputNumber: hold.outputNumber,
                      ownerType: "order",
                      ownerId: order.id,
                      productId: line.productId,
                      quantity: hold.quantity,
                    })
                  }
                  onEditQuantity={(line) => {
                    setLineMode("edit");
                    setLineProductId(line.productId);
                    setLineQuantity(String(line.quantity));
                    setLineError(null);
                    setLineOpen(true);
                  }}
                />
              </DocumentSection>
            ),
          },
          {
            id: "movements",
            label: "Движения",
            count: movementCount,
            panel: (
              <DocumentSection title="Движения">
                <DocumentLedger bare snapshot={snapshot} filter={movementFilter} />
              </DocumentSection>
            ),
          },
          {
            id: "history",
            label: "История",
            count: historyEntries.length,
            panel: (
              <DocumentHistory
                entries={historyEntries}
                renderStatus={(statusKey) => (
                  <StatusPill
                    status={statusKey}
                    label={CUSTOMER_ORDER_STATUS_LABELS[statusKey as CustomerOrderStatus]}
                  />
                )}
              />
            ),
          },
        ]}
      />

      <ReservationForm
        snapshot={snapshot}
        balances={balances}
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        reload={reload}        preset={{
          toOwnerType: "order",
          toOwnerId: order.id,
          productId: reserveLine?.productId,
        }}
      />
      <ShipmentForm
        key={`order-ship:${order.id}:${shipOpen ? "open" : "closed"}`}
        snapshot={snapshot}
        balances={balances}
        open={shipOpen}
        onOpenChange={setShipOpen}
        reload={reload}        preset={{ intention: "shipment", customerOrderId: order.id }}
      />
      <ReservationForm
        snapshot={snapshot}
        balances={balances}
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        reload={reload}        preset={{
          toOwnerType: null,
          toOwnerId: null,
          fromOwnerType: "order",
          fromOwnerId: order.id,
          productId: releasePlace?.line.productId,
          locationType: releasePlace?.locationType === "customer_order" || releasePlace?.locationType === "production_order" ? undefined : releasePlace?.locationType as "warehouse" | "transfer" | undefined,
          locationId: releasePlace?.locationId,
        }}
      />
      <OutputReleaseDialog
        snapshot={snapshot}
        target={outputReleaseTarget}
        onClose={() => setOutputReleaseTarget(null)}
        reload={reload}
      />
      <ProductionFromOrderForm
        snapshot={snapshot}
        balances={balances}
        open={productionOpen}
        onOpenChange={setProductionOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
      <ReserveOnProductionForm
        snapshot={snapshot}
        balances={balances}
        open={reserveOnProductionOpen}
        onOpenChange={setReserveOnProductionOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
      <OutputFromOrderForm
        snapshot={snapshot}
        balances={balances}
        open={outputOpen}
        onOpenChange={setOutputOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
      <TransferReservedForm
        snapshot={snapshot}
        balances={balances}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
      <ReserveOnTransferForm
        snapshot={snapshot}
        balances={balances}
        open={reserveOnTransferOpen}
        onOpenChange={setReserveOnTransferOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
      <OrderLineDialog
        open={lineOpen}
        onOpenChange={(next) => {
          setLineOpen(next);
          if (!next) {
            setLineError(null);
          }
        }}
        mode={lineMode}
        products={snapshot.products.map((product) => ({
          id: product.id,
          label: productIdentityLabel(product, product.id),
        }))}
        productId={lineProductId}
        productLabel={
          productById(snapshot, lineProductId)?.name ??
          lines.find((line) => line.productId === lineProductId)?.productName ??
          lineProductId
        }
        quantity={lineQuantity}
        hint={
          lineProductId
            ? (() => {
                const existing =
                  lineMode === "add" ? lines.find((line) => line.productId === lineProductId) : undefined;
                const shipped = `отгружено ${formatQuantity(sumShippedForOrderProduct(balances, order.id, lineProductId))}`;
                return existing
                  ? `Уже в заказе ${formatQuantity(existing.quantity)} — количество сложится; ${shipped}`
                  : shipped;
              })()
            : null
        }
        pending={linePending}
        error={lineError}
        onProductIdChange={setLineProductId}
        onQuantityChange={setLineQuantity}
        onDelete={() => {
          setLineMode("delete");
          setLineError(null);
        }}
        onSubmit={() => {
          if (lineMode !== "delete" && (!lineProductId || !(Number(lineQuantity) > 0))) {
            setLineError("Выберите товар и количество");
            return;
          }
          if (!lineProductId) {
            return;
          }
          const existing = lines.find((line) => line.productId === lineProductId);
          const quantity = nextOrderLineQuantity(
            lineMode,
            existing ? existing.quantity : null,
            Number(lineQuantity),
          );
          setLinePending(true);
          setLineError(null);
          void (async () => {
            try {
              await setOrderLineQuantity({
                documentId: order.id,
                productId: lineProductId,
                quantity,
              });
              await reload();
              setLineOpen(false);
              setLineProductId("");
              setLineQuantity("1");
              toast.success(
                lineMode === "delete"
                  ? "Товар удалён из заказа клиента"
                  : lineMode === "edit"
                    ? "Количество в заказе клиента изменено"
                    : "Товар добавлен в заказ клиента",
              );
            } catch (caught) {
              setLineError(
                translateLogisticsError(caught instanceof Error ? caught.message : "Не удалось сохранить строку"),
              );
            } finally {
              setLinePending(false);
            }
          })();
        }}
      />
    </LogisticsPageShell>
  );
};
