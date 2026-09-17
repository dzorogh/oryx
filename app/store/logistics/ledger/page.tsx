import type { Metadata } from "next";
import { LedgerPage } from "@/features/logistics/ledger-page";

export const metadata: Metadata = {
  title: "Ledger | Store Logistics | Oryx BMS",
  description: "Immutable stock ledger",
};

const Page = () => <LedgerPage />;

export default Page;
