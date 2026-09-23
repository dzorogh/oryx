"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { productById } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import type {
  TransferOwnerGroup,
  TransferOwnerRef,
  TransferProductRow,
} from "@/features/logistics/transfer-detail-projection";
import { cn } from "@/lib/utils";

const Quantity = ({
  quantity,
  unit,
  className,
}: {
  quantity: number;
  unit?: string;
  className?: string;
}) => (
  <span
    className={cn("text-right font-semibold tabular-nums", className)}
    aria-label={`${formatQuantity(quantity)} ${unit ?? ""}`.trim()}
  >
    {formatQuantity(quantity)}
    {unit ? <span className="ml-1 font-normal text-muted-foreground/70">{unit === "pcs" ? "шт" : unit}</span> : null}
  </span>
);

const OwnerCell = ({ owner, total }: { owner: TransferOwnerRef; total: number }) => {
  let title: ReactNode;
  if (!owner.href) {
    title = <span className="font-medium">{owner.kind === "free" ? "Свободно" : owner.breakdownLabel}</span>;
  } else if (owner.kind === "order") {
    title = (
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-sm text-foreground/80">Заказ клиента</span>
        <Link href={owner.href} className="font-mono text-xs font-medium text-foreground hover:underline">
          {owner.breakdownLabel}
        </Link>
      </div>
    );
  } else {
    const separator = " · ";
    const splitAt = owner.breakdownLabel.indexOf(separator);
    const code = splitAt === -1 ? owner.breakdownLabel : owner.breakdownLabel.slice(0, splitAt);
    title = (
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-sm text-foreground/80">Регион</span>
        <Link href={owner.href} className="font-mono text-xs font-medium text-foreground hover:underline">
          {code}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {title}
      <span className="text-xs text-muted-foreground">Итого {formatQuantity(total)}</span>
    </div>
  );
};

export const TransferProductManifest = ({
  snapshot,
  groups,
  products,
  bare = false,
}: {
  snapshot: LogisticsSnapshot;
  groups: TransferOwnerGroup[];
  products: TransferProductRow[];
  bare?: boolean;
}) => {
  const switchId = useId();
  const [grouped, setGrouped] = useState(true);
  const empty = products.length === 0;

  const tools = (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
      <span id={switchId}>Группировать по резерву</span>
      <Switch
        checked={grouped}
        onCheckedChange={(checked) => setGrouped(Boolean(checked))}
        aria-labelledby={switchId}
      />
    </label>
  );

  const body = empty ? (
    <p className="px-4 py-8 text-center text-sm text-muted-foreground">В этом перемещении нет товаров.</p>
  ) : grouped ? (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground" style={{ width: "28%" }}>
              Закреплено за
            </th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              Товар
            </th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
              Количество
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) =>
            group.lines.map((line, index) => {
              const unit = productById(snapshot, line.productId)?.unit;
              return (
                <tr key={`${group.key}-${line.productId}`} className="border-b border-border/60 last:border-b-0 hover:bg-muted/40">
                  {index === 0 ? (
                    <td
                      rowSpan={group.lines.length}
                      className="border-r border-border/60 bg-[#fcfcfc] px-4 py-2.5 align-top"
                    >
                      <OwnerCell owner={group} total={group.total} />
                    </td>
                  ) : null}
                  <td className="px-4 py-2.5">
                    <ProductIdentity snapshot={snapshot} productId={line.productId} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Quantity quantity={line.quantity} unit={unit} />
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              Товар
            </th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              Закреплено за
            </th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
              Количество
            </th>
          </tr>
        </thead>
        <tbody>
          {products.flatMap((product) =>
            product.breakdown.map((owner) => {
              const unit = productById(snapshot, product.productId)?.unit;
              return (
                <tr
                  key={`${product.productId}-${owner.key}`}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2.5">
                    <ProductIdentity snapshot={snapshot} productId={product.productId} />
                  </td>
                  <td className="px-4 py-2.5">
                    <OwnerCell owner={owner} total={owner.quantity} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Quantity quantity={owner.quantity} unit={unit} />
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );

  if (bare) {
    return (
      <div>
        <div className="flex items-center justify-end border-b border-border/60 px-4 py-3">{tools}</div>
        {body}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Товары и резервы</h2>
        {tools}
      </div>
      {body}
    </section>
  );
};
