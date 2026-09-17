import { ProductDetailPage as StoreDemoProductDetailPage } from "@/components/store/pim/products/detail/product-detail-page";
import { getProductDetail } from "@/components/store/pim/products/detail/product-detail-demo-data";
import { ProductDetailPage as LogisticsProductDetailPage } from "@/features/logistics/catalog-pages";

type StoreProductDetailRouteProps = {
  params: Promise<{ productId: string }>;
};

const StoreProductDetailRoute = async ({ params }: StoreProductDetailRouteProps) => {
  const { productId } = await params;

  if (getProductDetail(productId)) {
    return <StoreDemoProductDetailPage productId={productId} />;
  }

  return <LogisticsProductDetailPage productId={productId} />;
};

export default StoreProductDetailRoute;
