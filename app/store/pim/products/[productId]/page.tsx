import { Suspense } from "react";
import { StoreProductCardPage } from "@/features/store/product-card/store-product-card-page";

type StoreProductDetailRouteProps = {
  params: Promise<{ productId: string }>;
};

const StoreProductDetailRoute = async ({ params }: StoreProductDetailRouteProps) => {
  const { productId } = await params;

  return (
    <Suspense fallback={null}>
      <StoreProductCardPage productId={productId} />
    </Suspense>
  );
};

export default StoreProductDetailRoute;
