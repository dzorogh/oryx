// english-ui:ignore-file
import type { Metadata } from "next";
import { OutputCalendarPage } from "@/features/logistics/output-calendar-page";

export const metadata: Metadata = {
  title: "Календарь выпусков | Логистика магазина | Oryx BMS",
  description: "Приход по выпускам по месяцам",
};

const Page = () => <OutputCalendarPage />;

export default Page;
