// english-ui:ignore-file
import type { Metadata } from "next";
import { RegionsPage } from "@/features/store/directories/regions-page";

export const metadata: Metadata = {
  title: "Регионы | Магазин | Oryx BMS",
  description: "Регионы продаж, которые могут владеть резервом",
};

const Page = () => <RegionsPage />;

export default Page;
