import Link from "next/link";
import type { ReactNode } from "react";
import { hrefForProduct } from "@/features/logistics/logistics-availability";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { productById, productCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const ProductIdentity = ({
  snapshot,
  productId,
  nameAs = "link",
  name,
  productName,
}: {
  snapshot?: LogisticsSnapshot;
  productId: string;
  nameAs?: "link" | "text";
  name?: ReactNode;
  /** Historical line snapshot — preferred over live catalog. */
  productName?: string | null;
}) => {
  const product = snapshot ? productById(snapshot, productId) : undefined;
  const label = productName || product?.name || productId;
  const code = snapshot ? productCode(snapshot, productId) : formatLogisticsCode("product", productId);
  const title =
    name ??
    (nameAs === "link" && productId ? (
      <Link href={hrefForProduct(productId)} className="text-sm font-medium text-primary hover:underline">
        {label}
      </Link>
    ) : (
      <span className="text-sm font-medium">{label}</span>
    ));

  return (
    <div className="min-w-0">
      {title}
      {code ? (
        <div className="mt-0.5">
          <LogisticsCodeBadge
            code={code}
            href={nameAs === "link" && productId ? hrefForProduct(productId) : undefined}
          />
        </div>
      ) : null}
    </div>
  );
};
