// english-ui:ignore-file
import type { Metadata } from "next";
import { ManufacturersPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Производители | Логистика магазина | Oryx BMS",
  description: "Производители",
};

const Page = () => <ManufacturersPage />;

export default Page;
