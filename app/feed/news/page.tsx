import type { Metadata } from "next";
import { NewsPage } from "@/features/feed/news/news-page";

export const metadata: Metadata = {
  title: "News | Oryx BMS",
  description: "Корпоративные новости, объявления и рубрики",
};

const FeedNewsPage = () => <NewsPage />;

export default FeedNewsPage;
