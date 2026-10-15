// english-ui:ignore-file
import type { Metadata } from "next";
import { RegionDetailPage } from "@/features/store/directories/regions-page";

export const metadata: Metadata = {
  title: "Регион | Магазин | Oryx BMS",
  description: "Резерв региона",
};

const Page = () => <RegionDetailPage />;

export default Page;
