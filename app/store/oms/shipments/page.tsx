// english-ui:ignore-file
import { Suspense } from "react";
import type { Metadata } from "next";
import { ShipmentsPage } from "@/features/oms/flow-documents-pages";

export const metadata: Metadata = {
  title: "Отгрузки и возвраты | OMS | Oryx BMS",
  description: "Единый список отгрузок и возвратов",
};

const Page = () => (
  <Suspense>
    <ShipmentsPage />
  </Suspense>
);

export default Page;
