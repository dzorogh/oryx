import type { Metadata } from "next";
import { NewsPage } from "@/features/news/news-page";

export const metadata: Metadata = {
  title: "Новости | Oryx BMS",
  description: "Корпоративные новости, объявления и рубрики",
};

const PulseNewsPage = () => <NewsPage />;

export default PulseNewsPage;
