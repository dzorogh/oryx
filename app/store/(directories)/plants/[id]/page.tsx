// english-ui:ignore-file
import type { Metadata } from "next";
import { PlantDetailPage } from "@/features/store/directories/catalog-pages";

export const metadata: Metadata = {
  title: "Завод | Магазин | Oryx BMS",
  description: "Карточка производителя",
};

const Page = () => <PlantDetailPage />;

export default Page;
