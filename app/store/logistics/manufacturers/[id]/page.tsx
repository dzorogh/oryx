// english-ui:ignore-file
import type { Metadata } from "next";
import { ManufacturerDetailPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Производитель | Логистика магазина | Oryx BMS",
  description: "Карточка производителя",
};

const Page = () => <ManufacturerDetailPage />;

export default Page;
