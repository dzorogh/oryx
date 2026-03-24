import { notFound } from "next/navigation";
import { ORDER_PRESETS } from "@/domain/packing/constants";
import { OrderPackingDynamicContent } from "@/features/packing-visualization/components/order-view-section";
import { OrderPageHeader } from "@/components/pim/order-header";

const allowedOrderIds = new Set(ORDER_PRESETS.map((preset) => preset.orderId));

export const generateStaticParams = () =>
  ORDER_PRESETS.map((preset) => ({ orderId: String(preset.orderId) }));

type OrderPageProps = {
  params: Promise<{ orderId: string }>;
};

const OrderPage = async ({ params }: OrderPageProps) => {
  const { orderId: raw } = await params;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !allowedOrderIds.has(parsed)) {
    notFound();
  }

  return (
    <>
      <OrderPageHeader orderId={parsed} />
      <OrderPackingDynamicContent selectedOrderId={parsed} />
    </>
  );
};

export default OrderPage;
