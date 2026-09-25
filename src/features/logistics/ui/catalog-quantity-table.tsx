"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  UNCATEGORIZED_GROUP_ID,
  allCategoryGroupIds,
  buildCategoryTree,
  leafCategoryIds,
  pluralPozicii,
  type CategoryRef,
  type CategoryTreeNode,
} from "@/features/logistics/category-tree";
import { formatQuantity, quantityUnitLabel } from "@/features/logistics/logistics-labels";
import { useStickyCategoryRows } from "@/features/logistics/ui/use-sticky-category-rows";
import {
  categoryStartsOpen,
  enteredQuantityKeys,
  formatLimitNumber,
  parseDecimalQuantity,
  priceIssue,
  quantityIssue,
  type QuantityIssue,
  type QuantityLimitMode,
} from "@/features/logistics/ui/catalog-quantity-model";
import { cn } from "@/lib/utils";

export type CatalogOwnerKind = "free" | "order" | "region";

export type CatalogOwnerRow = {
  key: string;
  kind?: CatalogOwnerKind;
  label: string;
  limit: number | null;
  hints: Array<string | number | null>;
};

export type CatalogProductRow = {
  id: string;
  name: string;
  code: string;
  unit: string;
  categoryIds: string[];
  owners: CatalogOwnerRow[];
  /** Подсказки на строке товара, если колонки не про владельца. */
  hints?: Array<string | number | null>;
};

export type CatalogHintColumn = {
  id: string;
  header: string;
  muted?: boolean;
  bold?: boolean;
};

export const focusQuantityInput = (key: string) => {
  document.querySelector<HTMLInputElement>(`[data-qty-key="${CSS.escape(key)}"]`)?.focus();
};

const focusNextQuantity = (current: HTMLInputElement) => {
  const inputs = [...document.querySelectorAll<HTMLInputElement>("[data-qty-key]")];
  const index = inputs.indexOf(current);
  const next = inputs[index + 1];
  next?.focus();
  next?.select();
};

export const CatalogQuantityTable = ({
  categories,
  products,
  columns,
  quantities,
  onQuantityChange,
  limitMode,
  quantityHeader = "Количество",
  issueFor,
  search,
  collapsed,
  onToggleGroup,
  onlySelected,
  showPrice,
  prices,
  onPriceChange,
  priceList,
  moneySymbol,
  flat,
  empty,
}: {
  categories: CategoryRef[];
  products: CatalogProductRow[];
  columns: CatalogHintColumn[];
  quantities: Record<string, string>;
  onQuantityChange: (key: string, raw: string) => void;
  limitMode: QuantityLimitMode;
  quantityHeader?: string;
  issueFor?: (key: string, raw: string, limit: number | null) => QuantityIssue | null;
  search: string;
  collapsed: Set<string>;
  onToggleGroup: (id: string) => void;
  onlySelected: boolean;
  showPrice?: boolean;
  prices?: Record<string, string>;
  onPriceChange?: (productId: string, raw: string) => void;
  priceList?: Record<string, number | null>;
  /** Символ валюты для колонки «Сумма» в однострочном режиме. */
  moneySymbol?: string;
  /** Одна строка на товар: количество и сумма на ней, без подстрок владельцев. */
  flat?: boolean;
  empty?: string;
}) => {
  const query = search.trim().toLowerCase();
  const entered = useMemo(() => new Set(enteredQuantityKeys(quantities)), [quantities]);
  const visible = useMemo(
    () =>
      products.filter((product) => {
        const hit =
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.code.toLowerCase().includes(query);
        if (!hit) return false;
        if (!onlySelected) return true;
        return product.owners.some((owner) => entered.has(owner.key));
      }),
    [entered, onlySelected, products, query],
  );
  const placed = useMemo(
    () =>
      visible.map((product) => ({
        ...product,
        categoryIds: leafCategoryIds(product.categoryIds, categories),
      })),
    [categories, visible],
  );
  const tree = useMemo(
    () => buildCategoryTree(categories, placed, new Set(placed.map((product) => product.id))),
    [categories, placed],
  );
  const { scrollRef, headRef, stickyIds, onScroll, scrollStyle, groupStickyTop } = useStickyCategoryRows(
    { collapsed, roots: tree.roots, uncategorized: tree.uncategorized },
    "--dialog-head-h",
  );

  const renderProduct = (product: CatalogProductRow) => (
    <ProductBlock
      key={product.id}
      product={product}
      columns={columns}
      quantities={quantities}
      onQuantityChange={onQuantityChange}
      limitMode={limitMode}
      issueFor={issueFor}
      showPrice={showPrice}
      prices={prices}
      onPriceChange={onPriceChange}
      listPrice={priceList?.[product.id] ?? null}
      moneySymbol={moneySymbol}
      flat={flat}
    />
  );

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        {empty ?? (query ? "Ничего не найдено" : "Нет строк")}
      </div>
    );
  }

  const colSpan = 2 + columns.length + (showPrice ? 1 : 0) + (flat && showPrice ? 1 : 0);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={scrollStyle}
      className="overflow-auto rounded-lg border"
    >
      <table className="w-full border-collapse text-sm">
        <thead ref={headRef} className="sticky top-0 z-20 bg-background">
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Товар</th>
            {columns.map((column) => (
              <th key={column.id} className="px-2 py-2 text-right font-medium">
                {column.header}
              </th>
            ))}
            {showPrice ? <th className="px-2 py-2 text-right font-medium">Цена</th> : null}
            <th className="w-36 px-3 py-2 text-right font-medium">{quantityHeader}</th>
            {flat && showPrice ? <th className="w-32 px-3 py-2 text-right font-medium">Сумма</th> : null}
          </tr>
        </thead>
        <tbody>
          {tree.roots.map((node) => (
            <GroupRows
              key={node.id}
              node={node}
              collapsed={collapsed}
              onToggleGroup={onToggleGroup}
              stickyTop={groupStickyTop}
              stickyIds={stickyIds}
              colSpan={colSpan}
              quantities={quantities}
              renderProduct={renderProduct}
            />
          ))}
          {tree.uncategorized.length > 0 ? (
            <>
              <CategoryRow
                id={UNCATEGORIZED_GROUP_ID}
                name="Без категории"
                depth={0}
                collapsed={collapsed.has(UNCATEGORIZED_GROUP_ID)}
                summary={categorySummary(
                  tree.uncategorized as CatalogProductRow[],
                  quantities,
                )}
                sticky={stickyIds.has(UNCATEGORIZED_GROUP_ID)}
                stickyTop={groupStickyTop(0)}
                colSpan={colSpan}
                onToggle={() => onToggleGroup(UNCATEGORIZED_GROUP_ID)}
              />
              {collapsed.has(UNCATEGORIZED_GROUP_ID)
                ? null
                : tree.uncategorized.map((product) => renderProduct(product as CatalogProductRow))}
            </>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};

const subtreeProducts = (node: CategoryTreeNode<CatalogProductRow>): CatalogProductRow[] => [
  ...node.products,
  ...node.children.flatMap(subtreeProducts),
];

const categorySummary = (products: CatalogProductRow[], quantities: Record<string, string>): string => {
  let positions = 0;
  let pieces = 0;
  for (const product of products) {
    const entered = product.owners.reduce((sum, owner) => sum + (parseDecimalQuantity(quantities[owner.key] ?? "") ?? 0), 0);
    if (entered > 0) {
      positions += 1;
      pieces += entered;
    }
  }
  if (positions === 0) return "0 позиций";
  return `${pluralPozicii(positions)} · ${formatQuantity(pieces, "шт")}`;
};

const CategoryRow = ({
  id,
  name,
  depth,
  collapsed,
  summary,
  sticky,
  stickyTop,
  colSpan,
  onToggle,
}: {
  id: string;
  name: string;
  depth: number;
  collapsed: boolean;
  summary: string;
  sticky: boolean;
  stickyTop: string;
  colSpan: number;
  onToggle: () => void;
}) => (
  <tr
    data-group-id={id}
    data-group-depth={depth}
    className={cn("cursor-pointer bg-muted/60", sticky && "sticky z-10")}
    style={sticky ? { top: stickyTop } : undefined}
    onClick={onToggle}
  >
    <td colSpan={colSpan} className="px-3 py-1.5 text-sm font-semibold" style={{ paddingLeft: 12 + depth * 16 }}>
      <span className="inline-flex items-center gap-1.5">
        {collapsed ? (
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        )}
        {name}
        <span className="text-xs font-normal text-muted-foreground">{summary}</span>
      </span>
    </td>
  </tr>
);

const GroupRows = ({
  node,
  collapsed,
  onToggleGroup,
  stickyTop,
  stickyIds,
  colSpan,
  quantities,
  renderProduct,
}: {
  node: CategoryTreeNode<CatalogProductRow>;
  collapsed: Set<string>;
  onToggleGroup: (id: string) => void;
  stickyTop: (depth: number) => string;
  stickyIds: Set<string>;
  colSpan: number;
  quantities: Record<string, string>;
  renderProduct: (product: CatalogProductRow) => ReactNode;
}) => {
  const closed = collapsed.has(node.id);
  return (
    <>
      <CategoryRow
        id={node.id}
        name={node.name}
        depth={node.depth}
        collapsed={closed}
        summary={categorySummary(subtreeProducts(node), quantities)}
        sticky={stickyIds.has(node.id)}
        stickyTop={stickyTop(node.depth)}
        colSpan={colSpan}
        onToggle={() => onToggleGroup(node.id)}
      />
      {closed
        ? null
        : node.products.map((product) => renderProduct(product))}
      {closed
        ? null
        : node.children.map((child) => (
            <GroupRows
              key={child.id}
              node={child}
              collapsed={collapsed}
              onToggleGroup={onToggleGroup}
              stickyTop={stickyTop}
              stickyIds={stickyIds}
              colSpan={colSpan}
              quantities={quantities}
              renderProduct={renderProduct}
            />
          ))}
    </>
  );
};

const ProductBlock = ({
  product,
  columns,
  quantities,
  onQuantityChange,
  limitMode,
  issueFor,
  showPrice,
  prices,
  onPriceChange,
  listPrice,
  moneySymbol,
  flat,
}: {
  product: CatalogProductRow;
  columns: CatalogHintColumn[];
  quantities: Record<string, string>;
  onQuantityChange: (key: string, raw: string) => void;
  limitMode: QuantityLimitMode;
  issueFor?: (key: string, raw: string, limit: number | null) => QuantityIssue | null;
  showPrice?: boolean;
  prices?: Record<string, string>;
  onPriceChange?: (productId: string, raw: string) => void;
  listPrice: number | null;
  moneySymbol?: string;
  flat?: boolean;
}) => {
  const priceRaw = prices?.[product.id] ?? "";
  const priceEdited =
    listPrice != null && priceRaw.trim() !== "" && Number(priceRaw.replace(/\s/g, "").replace(",", ".")) !== listPrice;
  const lineOwner = product.owners[0];
  const lineQty = lineOwner ? parseDecimalQuantity(quantities[lineOwner.key] ?? "") : null;
  const linePrice = parseDecimalQuantity(priceRaw);
  const lineSum = lineQty != null && lineQty > 0 && linePrice != null ? lineQty * linePrice : null;
  return (
    <>
      <tr className="border-t border-b border-t-zinc-200 border-b-zinc-100 bg-background">
        <td className="px-3 py-2">
          <div className="font-medium">{product.name}</div>
          <div className="text-xs text-muted-foreground">{product.code}</div>
        </td>
        {columns.map((column, index) => (
          <td
            key={column.id}
            className={cn(
              "px-2 py-2 text-right tabular-nums",
              column.muted ? "text-muted-foreground" : "text-foreground",
              column.bold && "font-semibold",
            )}
          >
            {formatHint(productColumnValue(product, index), product.unit)}
          </td>
        ))}
        {showPrice ? (
          <td className="px-2 py-2 text-right">
            <Input
              data-price-key={product.id}
              value={priceRaw}
              inputMode="decimal"
              aria-invalid={priceIssue(priceRaw)?.kind === "error"}
              className={cn("ml-auto h-8 w-28 text-right", priceIssue(priceRaw)?.kind === "error" && "border-destructive")}
              aria-label={`Цена ${product.name}`}
              onChange={(event) => onPriceChange?.(product.id, event.target.value)}
            />
            {priceIssue(priceRaw) ? (
              <p className="mt-0.5 text-right text-xs text-destructive">{priceIssue(priceRaw)?.message}</p>
            ) : priceEdited && listPrice != null ? (
              <div className="mt-0.5 text-xs text-muted-foreground">по прайсу {formatGroupedNumber(listPrice)}</div>
            ) : null}
          </td>
        ) : null}
        {flat && lineOwner ? (
          <td className="px-3 py-2">
            <QuantityField
              ownerKey={lineOwner.key}
              raw={quantities[lineOwner.key] ?? ""}
              limit={lineOwner.limit}
              productName={product.name}
              unit={product.unit}
              ownerLabel={ownerDisplayLabel(lineOwner.kind, lineOwner.label)}
              limitMode={limitMode}
              issueFor={issueFor}
              onQuantityChange={onQuantityChange}
            />
          </td>
        ) : (
          <td />
        )}
        {flat && showPrice ? (
          <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">
            {lineSum == null ? "—" : formatCatalogMoney(lineSum, moneySymbol ?? "₽")}
          </td>
        ) : null}
      </tr>
      {flat
        ? null
        : product.owners.map((owner) => {
        const raw = quantities[owner.key] ?? "";
        const issue = issueFor
          ? issueFor(owner.key, raw, owner.limit)
          : quantityIssue(raw, owner.limit, limitMode);
        const empty = !raw.trim();
        return (
          <tr key={owner.key} className={cn("border-b border-zinc-100", empty && "text-muted-foreground/70")}>
            <td className="px-3 py-1.5 pl-8 text-xs">
              <OwnerChip kind={owner.kind} label={owner.label} />
            </td>
            {columns.map((column, index) => (
              <td
                key={column.id}
                className={cn(
                  "px-2 py-1.5 text-right text-xs tabular-nums",
                  column.muted && "text-muted-foreground",
                  column.bold && "font-medium text-foreground",
                )}
              >
                {formatHint(owner.hints[index] ?? null, product.unit)}
              </td>
            ))}
            {showPrice ? <td /> : null}
            <td className="px-3 py-1.5">
              <div className="relative ml-auto w-32">
                <Input
                  data-qty-key={owner.key}
                  type="text"
                  inputMode="decimal"
                  value={raw}
                  aria-invalid={issue?.kind === "error"}
                  aria-label={`Количество ${product.name} ${ownerDisplayLabel(owner.kind, owner.label)}`}
                  className={cn("h-8 pr-8 text-right", issue?.kind === "error" && "border-destructive")}
                  onChange={(event) => onQuantityChange(owner.key, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
                      event.preventDefault();
                      focusNextQuantity(event.currentTarget);
                    }
                  }}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                  {quantityUnitLabel(product.unit)}
                </span>
              </div>
              {issue ? (
                <p className={cn("mt-0.5 text-right text-xs", issue.kind === "error" ? "text-destructive" : "text-muted-foreground")}>
                  {issue.message}
                </p>
              ) : null}
            </td>
          </tr>
        );
      })}
    </>
  );
};

const formatGroupedNumber = (value: number): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);

export const formatCatalogMoney = (value: number, symbol: string): string =>
  `${formatGroupedNumber(value)} ${symbol}`;

const QuantityField = ({
  ownerKey,
  raw,
  limit,
  productName,
  unit,
  ownerLabel,
  limitMode,
  issueFor,
  onQuantityChange,
}: {
  ownerKey: string;
  raw: string;
  limit: number | null;
  productName: string;
  unit: string;
  ownerLabel: string;
  limitMode: QuantityLimitMode;
  issueFor?: (key: string, raw: string, limit: number | null) => QuantityIssue | null;
  onQuantityChange: (key: string, raw: string) => void;
}) => {
  const issue = issueFor ? issueFor(ownerKey, raw, limit) : quantityIssue(raw, limit, limitMode);
  return (
    <>
      <div className="relative ml-auto w-32">
        <Input
          data-qty-key={ownerKey}
          type="text"
          inputMode="decimal"
          value={raw}
          aria-invalid={issue?.kind === "error"}
          aria-label={`Количество ${productName} ${ownerLabel}`}
          className={cn("h-8 pr-8 text-right", issue?.kind === "error" && "border-destructive")}
          onChange={(event) => onQuantityChange(ownerKey, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
              event.preventDefault();
              focusNextQuantity(event.currentTarget);
            }
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
          {quantityUnitLabel(unit)}
        </span>
      </div>
      {issue ? (
        <p className={cn("mt-0.5 text-right text-xs", issue.kind === "error" ? "text-destructive" : "text-amber-700")}>
          {issue.message}
        </p>
      ) : null}
    </>
  );
};

const productColumnValue = (product: CatalogProductRow, index: number): string | number | null => {
  const own = product.hints?.[index];
  if (typeof own === "number" || typeof own === "string") return own;
  const numbers = product.owners
    .map((owner) => owner.hints[index])
    .filter((value): value is number => typeof value === "number");
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0);
};

const formatHint = (value: string | number | null, unit: string): string => {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return formatQuantity(value, unit);
  return value;
};

const OWNER_KIND_TEXT: Record<CatalogOwnerKind, string | null> = {
  free: null,
  order: "заказ клиента",
  region: "регион",
};

const ownerDisplayLabel = (kind: CatalogOwnerKind | undefined, label: string) =>
  kind === "region" ? label.toUpperCase() : label;

const OwnerChip = ({ kind, label }: { kind?: CatalogOwnerKind; label: string }) => {
  if (!kind) return label;
  const text = ownerDisplayLabel(kind, label);
  const kindText = OWNER_KIND_TEXT[kind];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-zinc-200 bg-background px-2 text-xs font-medium text-zinc-700">
        <span
          className={cn(
            "size-1.5 rounded-full bg-zinc-400",
            kind === "order" && "bg-blue-600",
            kind === "region" && "bg-violet-600",
          )}
          aria-hidden
        />
        {text}
      </span>
      {kindText ? <span className="text-xs text-zinc-400">{kindText}</span> : null}
    </span>
  );
};

const enteredProductIds = (products: CatalogProductRow[], quantities: Record<string, string>): string[] =>
  products
    .filter((product) =>
      product.owners.some((owner) => (parseDecimalQuantity(quantities[owner.key] ?? "") ?? 0) > 0),
    )
    .map((product) => product.id);

const collapsedForSignature = (
  categories: CategoryRef[],
  products: CatalogProductRow[],
  quantities: Record<string, string>,
  search: string,
  groupIds: string[],
): Set<string> => {
  const query = search.trim().toLowerCase();
  const entered = new Set(enteredProductIds(products, quantities));
  const anyEntered = entered.size > 0;
  const searching = query.length > 0;
  if (!anyEntered && !searching) return new Set();
  const byId = new Map(categories.map((category) => [category.id, category]));
  const open = new Set<string>();
  const addAncestors = (id: string) => {
    let current: string | null = id;
    while (current) {
      open.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
  };
  for (const product of products) {
    const matches = product.name.toLowerCase().includes(query) || product.code.toLowerCase().includes(query);
    const valued = entered.has(product.id);
    if (!categoryStartsOpen(valued, searching && matches, { anyEntered, searching })) continue;
    const leaves = leafCategoryIds(product.categoryIds, categories);
    if (leaves.length === 0) open.add(UNCATEGORIZED_GROUP_ID);
    for (const id of leaves) addAncestors(id);
  }
  return new Set(groupIds.filter((id) => !open.has(id)));
};

export const useCatalogCollapse = (
  categories: CategoryRef[],
  products: CatalogProductRow[],
  quantities: Record<string, string>,
  search: string,
) => {
  const groupIds = useMemo(() => allCategoryGroupIds(categories), [categories]);
  const signature = `${search.trim().toLowerCase()}|${enteredProductIds(products, quantities).sort().join(",")}|${groupIds.join(",")}`;
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [applied, setApplied] = useState(signature);
  if (applied !== signature) {
    setApplied(signature);
    setCollapsed(collapsedForSignature(categories, products, quantities, search, groupIds));
  }

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const collapseAll = () => setCollapsed(new Set(groupIds));
  const expandAll = () => setCollapsed(new Set());
  const allCollapsed = groupIds.length > 0 && groupIds.every((id) => collapsed.has(id));
  return { collapsed, toggle, collapseAll, expandAll, allCollapsed, setCollapsed };
};
