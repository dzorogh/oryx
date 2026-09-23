// english-ui:ignore-file
import type { Metadata } from "next";
import { PlantDetailPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Завод | Логистика магазина | Oryx BMS",
  description: "Карточка производителя",
};

const Page = () => <PlantDetailPage />;

export default Page;
