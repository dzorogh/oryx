import { redirect } from "next/navigation";
import { ORDER_PRESETS } from "@/domain/packing/constants";

export const generateStaticParams = () =>
  ORDER_PRESETS.map((preset) => ({ orderId: String(preset.orderId) }));

type OrderPageProps = {
  params: Promise<{ orderId: string }>;
};

const OrderPage = async ({ params }: OrderPageProps) => {
  const { orderId } = await params;
  redirect(`/store/orders/${orderId}`);
};

export default OrderPage;
