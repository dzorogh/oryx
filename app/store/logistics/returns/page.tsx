// english-ui:ignore-file
import { redirect } from "next/navigation";

export const metadata = {
  title: "Отгрузки и возвраты | Логистика магазина | Oryx BMS",
  description: "Перенаправление в единый раздел «Отгрузки и возвраты»",
};

const Page = () => {
  redirect("/store/logistics/shipments");
};

export default Page;
