import { notFound } from "next/navigation";
import { ProductDetailPage } from "@/components/store/pim/products/detail/product-detail-page";
import { getProductDetail } from "@/components/store/pim/products/detail/product-detail-demo-data";
import { STORE_CATALOG_ITEMS } from "@/components/store/pim/products/store-catalog-demo-data";

export const generateStaticParams = () =>
  STORE_CATALOG_ITEMS.map((item) => ({ productId: item.id }));

type StoreProductDetailRouteProps = {
  params: Promise<{ productId: string }>;
};

const StoreProductDetailRoute = async ({ params }: StoreProductDetailRouteProps) => {
  const { productId } = await params;

  if (!getProductDetail(productId)) {
    notFound();
  }

  return <ProductDetailPage productId={productId} />;
};

export default StoreProductDetailRoute;
