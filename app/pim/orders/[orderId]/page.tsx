import { redirect } from "next/navigation";

type OrderPageProps = {
  params: Promise<{ orderId: string }>;
};

const OrderPage = async ({ params }: OrderPageProps) => {
  const { orderId } = await params;
  redirect(`/store/orders/${orderId}`);
};

export default OrderPage;
