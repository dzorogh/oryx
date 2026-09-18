// english-ui:ignore-file
import { redirect } from "next/navigation";

export const metadata = {
  title: "Снятия | Логистика магазина | Oryx BMS",
  description: "Перенаправление в раздел «Резервы»",
};

const Page = () => {
  redirect("/store/logistics/reservations?operation=release");
};

export default Page;
