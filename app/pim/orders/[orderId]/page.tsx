import { redirect } from "next/navigation";
import { omsPath } from "@/features/oms/oms-paths";

type OrderPageProps = {
  params: Promise<{ orderId: string }>;
};

const OrderPage = async ({ params }: OrderPageProps) => {
  const { orderId } = await params;
  redirect(omsPath("customer-orders", encodeURIComponent(orderId)));
};

export default OrderPage;
