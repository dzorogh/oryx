// english-ui:ignore-file
import type { Metadata } from "next";
import { LedgerPage } from "@/features/logistics/ledger-page";

export const metadata: Metadata = {
  title: "Журнал | Логистика магазина | Oryx BMS",
  description: "Журнал движений остатков",
};

const Page = () => <LedgerPage />;

export default Page;
