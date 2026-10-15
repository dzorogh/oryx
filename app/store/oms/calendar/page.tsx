// english-ui:ignore-file
import type { Metadata } from "next";
import { OutputCalendarPage } from "@/features/oms/output-calendar-page";

export const metadata: Metadata = {
  title: "Календарь производства | OMS | Oryx BMS",
  description: "Приход по выпускам по месяцам",
};

const Page = () => <OutputCalendarPage />;

export default Page;
