import Link from "next/link";
import type { ReactNode } from "react";
import { hrefForProduct } from "@/features/logistics/logistics-availability";
import { productById, productCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const ProductIdentity = ({
  snapshot,
  productId,
  nameAs = "link",
  name,
}: {
  snapshot: LogisticsSnapshot;
  productId: string;
  nameAs?: "link" | "text";
  name?: ReactNode;
}) => {
  const product = productById(snapshot, productId);
  const label = product?.name ?? productId;
  const code = productCode(snapshot, productId);
  const title =
    name ??
    (nameAs === "link" ? (
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
          <LogisticsCodeBadge code={code} href={nameAs === "link" ? hrefForProduct(productId) : undefined} />
        </div>
      ) : null}
    </div>
  );
};
