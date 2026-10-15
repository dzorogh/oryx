// english-ui:ignore-file
import { redirect } from "next/navigation";

export const metadata = {
  title: "Отгрузки и возвраты | OMS | Oryx BMS",
  description: "Перенаправление в карточку единого документа",
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  redirect(`/store/oms/shipments/${id}`);
};

export default Page;
