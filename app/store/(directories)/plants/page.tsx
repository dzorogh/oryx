// english-ui:ignore-file
import type { Metadata } from "next";
import { PlantsPage } from "@/features/store/directories/catalog-pages";

export const metadata: Metadata = {
  title: "Заводы | Магазин | Oryx BMS",
  description: "Заводы",
};

const Page = () => <PlantsPage />;

export default Page;
