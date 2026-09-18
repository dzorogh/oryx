// english-ui:ignore-file
import type { Metadata } from "next";
import { ReservationsPage } from "@/features/logistics/reservations-page";

export const metadata: Metadata = {
  title: "Резервы | Логистика магазина | Oryx BMS",
  description: "Резервы остатков",
};

const Page = () => <ReservationsPage />;

export default Page;
