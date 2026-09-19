import type { Metadata } from "next";
import { ReservationsPage } from "@/features/logistics/reservations-page";

export const metadata: Metadata = {
  title: "Reservations | Store logistics | Oryx BMS",
  description: "Reserve, release, or reassign stock between Free, orders, and regions",
};

const Page = () => <ReservationsPage />;

export default Page;
