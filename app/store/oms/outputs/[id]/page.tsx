// english-ui:ignore-file
import type { Metadata } from "next";
import { OutputDetailPage } from "@/features/oms/flow-documents-pages";

export const metadata: Metadata = {
  title: "Выпуск | OMS | Oryx BMS",
  description: "Выпуск заказа на производство",
};

const Page = () => <OutputDetailPage />;

export default Page;
