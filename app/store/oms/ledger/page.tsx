// english-ui:ignore-file
import type { Metadata } from "next";
import { LedgerPage } from "@/features/oms/ledger-page";

export const metadata: Metadata = {
  title: "Журнал | OMS | Oryx BMS",
  description: "Журнал движений остатков",
};

const Page = () => <LedgerPage />;

export default Page;
