// english-ui:ignore-file
import { redirect } from "next/navigation";

export const metadata = {
  title: "Отгрузки и возвраты | Логистика магазина | Oryx BMS",
  description: "Перенаправление в карточку единого документа",
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  redirect(`/store/logistics/shipments/${id}`);
};

export default Page;
