import type { Metadata } from "next";
import { ReservationDetailPage } from "@/features/logistics/reservations-page";

export const metadata: Metadata = {
  title: "Reservation | Store Logistics | Oryx BMS",
  description: "Stock reservation",
};

const Page = () => <ReservationDetailPage />;

export default Page;
