import type { Metadata } from "next";
import { NewsPage } from "@/features/pulse/news/news-page";

export const metadata: Metadata = {
  title: "News | Oryx BMS",
  description: "Company news, announcements, and categories",
};

const PulseNewsPage = () => <NewsPage />;

export default PulseNewsPage;
