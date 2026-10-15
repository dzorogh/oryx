// english-ui:ignore-file
import type { Metadata } from "next";
import { OutputsPage } from "@/features/oms/flow-documents-pages";

export const metadata: Metadata = {
  title: "Выпуски | OMS | Oryx BMS",
  description: "Выпуски заказов на производство",
};

const Page = () => <OutputsPage />;

export default Page;
