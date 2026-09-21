// english-ui:ignore-file
import type { Metadata } from "next";
import { RegionDetailPage } from "@/features/logistics/regions-page";

export const metadata: Metadata = {
  title: "Регион | Логистика магазина | Oryx BMS",
  description: "Резерв региона",
};

const Page = () => <RegionDetailPage />;

export default Page;
