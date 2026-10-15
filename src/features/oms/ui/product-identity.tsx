import Link from "next/link";
import type { ReactNode } from "react";
import { hrefForProduct } from "@/features/oms/oms-availability";
import { formatEntityCode } from "@/lib/entity-codes";
import { productById, productCode } from "@/features/oms/oms-lookups";
import type { OmsSnapshot } from "@/features/oms/oms-types";
import { OmsCodeBadge } from "@/features/oms/ui/oms-code-badge";

export const ProductIdentity = ({
  snapshot,
  productId,
  nameAs = "link",
  name,
  productName,
}: {
  snapshot?: OmsSnapshot;
  productId: string;
  nameAs?: "link" | "text";
  name?: ReactNode;
  /** Historical line snapshot — preferred over live catalog. */
  productName?: string | null;
}) => {
  const product = snapshot ? productById(snapshot, productId) : undefined;
  const label = productName || product?.name || productId;
  const code = snapshot ? productCode(snapshot, productId) : formatEntityCode("product", productId);
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
          <OmsCodeBadge
            code={code}
            href={nameAs === "link" && productId ? hrefForProduct(productId) : undefined}
          />
        </div>
      ) : null}
    </div>
  );
};
