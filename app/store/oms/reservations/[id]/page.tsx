import type { Metadata } from "next";
import { ReservationDetailPage } from "@/features/oms/reservations-page";

export const metadata: Metadata = {
  title: "Резерв | OMS | Oryx BMS",
  description: "Назначение, источники и проведение резерва",
};

const Page = () => <ReservationDetailPage />;

export default Page;
