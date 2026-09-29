import { redirect } from "next/navigation";
import { logisticsPath } from "@/features/logistics/logistics-paths";

type OrderPageProps = {
  params: Promise<{ orderId: string }>;
};

const OrderPage = async ({ params }: OrderPageProps) => {
  const { orderId } = await params;
  redirect(logisticsPath("customer-orders", encodeURIComponent(orderId)));
};

export default OrderPage;
