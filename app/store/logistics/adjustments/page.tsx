// english-ui:ignore-file
import type { Metadata } from "next";
import { AdjustmentsPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Корректировки | Логистика магазина | Oryx BMS",
  description: "Корректировки и списания свободного остатка",
};

const Page = () => <AdjustmentsPage />;

export default Page;
