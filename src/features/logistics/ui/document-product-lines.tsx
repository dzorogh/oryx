"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { hrefForProduct } from "@/features/logistics/logistics-availability";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { productById } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";

export const DOCUMENT_PRODUCT_LINE_PREVIEW = 5;

export type DocumentProductLine = {
  productId: string;
  quantity: number;
  productName?: string | null;
  productSku?: string | null;
  productUnit?: string | null;
};

export const documentProductMoreLabel = (hidden: number, expanded: boolean) =>
  expanded ? "Свернуть" : `Ещё ${hidden}`;

export const DocumentProductMoreButton = ({
  hidden,
  expanded,
  onToggle,
  controlsId,
}: {
  hidden: number;
  expanded: boolean;
  onToggle: () => void;
  controlsId?: string;
}) => (
  <button
    type="button"
    className="w-fit text-left text-xs font-medium text-primary hover:underline"
    aria-expanded={expanded}
    aria-controls={controlsId}
    aria-label={expanded ? "Свернуть список товаров" : `Показать ещё ${hidden}`}
    onClick={onToggle}
  >
    {documentProductMoreLabel(hidden, expanded)}
  </button>
);

export const DocumentProductLines = ({
  snapshot,
  lines,
  empty = "—",
  previewLimit = DOCUMENT_PRODUCT_LINE_PREVIEW,
}: {
  /** Optional: used only as fallback when line has no productName/unit. */
  snapshot?: LogisticsSnapshot;
  lines: DocumentProductLine[];
  empty?: string;
  previewLimit?: number;
}) => {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const items = lines.filter((line) => line.productId || line.productName);
  if (items.length === 0) {
    return <span className="text-muted-foreground">{empty}</span>;
  }

  const hidden = Math.max(0, items.length - previewLimit);
  const visible = expanded || hidden === 0 ? items : items.slice(0, previewLimit);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <ul id={listId} className="flex flex-col gap-1">
        {visible.map((line, index) => {
          const product = snapshot ? productById(snapshot, line.productId) : undefined;
          const name = line.productName || product?.name || line.productId;
          return (
            <li key={`${line.productId || line.productName}-${index}`} className="flex items-start justify-between gap-3">
              {line.productId ? (
                <Link
                  href={hrefForProduct(line.productId)}
                  className="min-w-0 break-words text-sm font-medium text-primary hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <span className="min-w-0 break-words text-sm font-medium">{name}</span>
              )}
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {formatQuantity(line.quantity, line.productUnit || product?.unit)}
              </span>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <DocumentProductMoreButton
          hidden={hidden}
          expanded={expanded}
          controlsId={listId}
          onToggle={() => setExpanded((current) => !current)}
        />
      ) : null}
    </div>
  );
};
