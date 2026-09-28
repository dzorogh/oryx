import { Suspense } from "react";
import { ProductDetailPage as StoreDemoProductDetailPage } from "@/components/store/pim/products/detail/product-detail-page";
import { getProductDetail } from "@/components/store/pim/products/detail/product-detail-demo-data";
import { StoreProductCardPage } from "@/features/store/product-card/store-product-card-page";

type StoreProductDetailRouteProps = {
  params: Promise<{ productId: string }>;
};

const StoreProductDetailRoute = async ({ params }: StoreProductDetailRouteProps) => {
  const { productId } = await params;

  if (getProductDetail(productId)) {
    return <StoreDemoProductDetailPage productId={productId} />;
  }

  return (
    <Suspense fallback={null}>
      <StoreProductCardPage productId={productId} />
    </Suspense>
  );
};

export default StoreProductDetailRoute;
