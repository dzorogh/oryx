"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getProductDetail } from "./product-detail-demo-data";
import { ProductBasicInfo } from "./product-basic-info";
import { ProductVariants } from "./product-variants";

type ProductDetailPageProps = {
  productId: string;
};

export const ProductDetailPage = ({ productId }: ProductDetailPageProps) => {
  const product = getProductDetail(productId);

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-4 py-4">
        <div className="flex w-full flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/store/pim/products" aria-label="Open Store products" />}>
                  Store
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/store/pim/products" />}>Products</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product.displayName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <ProductBasicInfo product={product} />
          <ProductVariants variants={product.variants} />
        </div>
      </section>
    </main>
  );
};
