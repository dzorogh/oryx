// english-ui:ignore-file
import type { Metadata } from "next";
import { PlantsPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Заводы | Логистика магазина | Oryx BMS",
  description: "Заводы",
};

const Page = () => <PlantsPage />;

export default Page;
