import type { Metadata } from "next";
import { ReservationDetailPage } from "@/features/logistics/reservations-page";

export const metadata: Metadata = {
  title: "Reservation | Store logistics | Oryx BMS",
  description: "Reservation destination, sources, and posting",
};

const Page = () => <ReservationDetailPage />;

export default Page;
