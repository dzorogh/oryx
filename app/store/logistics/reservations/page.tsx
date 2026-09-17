import type { Metadata } from "next";
import { ReservationsPage } from "@/features/logistics/reservations-page";

export const metadata: Metadata = {
  title: "Reservations | Store Logistics | Oryx BMS",
  description: "Stock reservations",
};

const Page = () => <ReservationsPage />;

export default Page;
