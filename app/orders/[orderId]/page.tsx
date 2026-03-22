import { ORDER_PRESETS } from "@/domain/packing/constants";
import { OrderPackingDynamicContent } from "@/features/packing-visualization/components/order-packing-page";

export const generateStaticParams = () =>
  ORDER_PRESETS.map((preset) => ({ orderId: String(preset.orderId) }));

type OrderPageProps = {
  params: Promise<{ orderId: string }>;
};

const OrderPage = async ({ params }: OrderPageProps) => {
  const { orderId: raw } = await params;
  const parsed = Number(raw);

  return <OrderPackingDynamicContent selectedOrderId={parsed} />;
};

export default OrderPage;
