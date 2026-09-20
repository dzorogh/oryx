"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
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
  <span className={cn("text-right tabular-nums", className)} aria-label={`${formatQuantity(quantity)} ${unit ?? ""}`.trim()}>
    {formatQuantity(quantity)}
  </span>
);

const OwnerName = ({ owner }: { owner: TransferOwnerRef }) => {
  if (!owner.href) {
    return <span>{owner.kind === "free" ? owner.title : owner.breakdownLabel}</span>;
  }
  if (owner.kind === "order") {
    return (
      <span>
        Order{" "}
        <Link href={owner.href} className="text-primary hover:underline">
          {owner.breakdownLabel}
        </Link>
      </span>
    );
  }
  const separator = " · ";
  const splitAt = owner.breakdownLabel.indexOf(separator);
  const code = splitAt === -1 ? owner.breakdownLabel : owner.breakdownLabel.slice(0, splitAt);
  const name = splitAt === -1 ? "" : owner.breakdownLabel.slice(splitAt + separator.length);
  return (
    <span>
      Region{" "}
      <Link href={owner.href} className="text-primary hover:underline">
        {code}
      </Link>
      {name ? <span> · {name}</span> : null}
    </span>
  );
};

const BreakdownName = ({ owner }: { owner: TransferOwnerRef }) => {
  if (!owner.href) {
    return <span>{owner.breakdownLabel}</span>;
  }
  return (
    <Link href={owner.href} className="text-primary hover:underline">
      {owner.breakdownLabel}
    </Link>
  );
};

const UngroupedProduct = ({
  snapshot,
  product,
}: {
  snapshot: LogisticsSnapshot;
  product: TransferProductRow;
}) => {
  const reactId = useId();
  const panelId = `${reactId}-breakdown`;
  const [open, setOpen] = useState(false);
  const catalog = productById(snapshot, product.productId);
  const name = catalog?.name ?? product.productId;
  const unit = catalog?.unit;

  return (
    <div className={cn("border-b border-border last:border-b-0", open && "bg-muted/30")}>
      <button
        type="button"
        className="grid min-h-11 w-full grid-cols-[20px_minmax(0,1fr)_5.5rem] items-center gap-2 px-3 py-1 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-8"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${name}, ${formatQuantity(product.total)} ${unit ?? ""}`.trim()}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
        <ProductIdentity snapshot={snapshot} productId={product.productId} nameAs="text" />
        <Quantity quantity={product.total} unit={unit} className="text-sm font-semibold" />
      </button>
      {open ? (
        <div id={panelId} className="border-t border-border bg-muted/30 px-3 pb-1.5 pl-10">
          {product.breakdown.map((owner) => (
            <div
              key={owner.key}
              className="grid min-h-8 grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2 border-t border-border first:border-t-0"
            >
              <BreakdownName owner={owner} />
              <Quantity quantity={owner.quantity} unit={unit} className="text-sm font-medium" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const TransferProductManifest = ({
  snapshot,
  groups,
  products,
}: {
  snapshot: LogisticsSnapshot;
  groups: TransferOwnerGroup[];
  products: TransferProductRow[];
}) => {
  const switchId = useId();
  const [grouped, setGrouped] = useState(true);
  const empty = products.length === 0;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Products and reservations</h2>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium">
          <span id={switchId}>Group by reservation</span>
          <Switch
            checked={grouped}
            onCheckedChange={(checked) => setGrouped(Boolean(checked))}
            aria-labelledby={switchId}
          />
        </label>
      </div>

      {empty ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">No products in this transfer.</p>
      ) : grouped ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              <th scope="col" className="px-3 py-1.5 text-left font-semibold">
                Product
              </th>
              <th scope="col" className="w-[5.5rem] px-3 py-1.5 text-right font-semibold">
                Quantity
              </th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.key} className="border-b border-border last:border-b-0">
              <tr className="bg-muted/50">
                <th scope="rowgroup" className="px-3 py-1.5 text-left text-xs font-semibold">
                  <OwnerName owner={group} />
                </th>
                <td className="px-3 py-1.5 text-xs font-semibold">
                  <Quantity quantity={group.total} className="block w-full text-xs font-semibold" />
                </td>
              </tr>
              {group.lines.map((line) => {
                const unit = productById(snapshot, line.productId)?.unit;
                return (
                  <tr key={`${group.key}-${line.productId}`} className="border-t border-border">
                    <td className="px-3 py-1 pl-6">
                      <ProductIdentity snapshot={snapshot} productId={line.productId} />
                    </td>
                    <td className="px-3 py-1">
                      <Quantity quantity={line.quantity} unit={unit} className="block w-full text-sm font-semibold" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      ) : (
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span>Product</span>
            <span className="text-right">Quantity</span>
          </div>
          {products.map((product) => (
            <UngroupedProduct key={product.productId} snapshot={snapshot} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};
