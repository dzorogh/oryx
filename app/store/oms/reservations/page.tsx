import type { Metadata } from "next";
import { ReservationsPage } from "@/features/oms/reservations-page";

export const metadata: Metadata = {
  title: "Резервы | OMS | Oryx BMS",
  description: "Резерв, снятие и переназначение между свободно, заказами и регионами",
};

const Page = () => <ReservationsPage />;

export default Page;
