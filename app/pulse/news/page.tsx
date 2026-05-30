import type { Metadata } from "next";
import { NewsPage } from "@/features/pulse/news/news-page";

export const metadata: Metadata = {
  title: "News | Oryx BMS",
  description: "Корпоративные новости, объявления и рубрики",
};

const PulseNewsPage = () => <NewsPage />;

export default PulseNewsPage;
