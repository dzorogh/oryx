import type { Metadata } from "next";
import { ReservationDetailPage } from "@/features/logistics/reservations-page";

export const metadata: Metadata = {
  title: "Резерв | Логистика магазина | Oryx BMS",
  description: "Назначение, источники и проведение резерва",
};

const Page = () => <ReservationDetailPage />;

export default Page;
