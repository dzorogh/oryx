import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NEWS_ITEMS, getNewsItemById } from "@/components/home/news-demo-data";
import { NewsArticlePage } from "@/features/pulse/news/news-article-page";
import { buildCommentSeed } from "@/features/comments/comments-demo-data";

type PageParams = { id: string };

export const generateStaticParams = (): PageParams[] =>
  NEWS_ITEMS.map((item) => ({ id: item.id }));

export const generateMetadata = async ({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> => {
  const { id } = await params;
  const item = getNewsItemById(id);
  if (!item) {
    return { title: "News | Oryx BMS" };
  }
  return {
    title: `${item.title} | Oryx BMS`,
    description: item.excerpt,
  };
};

const PulseNewsArticlePage = async ({ params }: { params: Promise<PageParams> }) => {
  const { id } = await params;
  const item = getNewsItemById(id);
  if (!item) {
    notFound();
  }
  return <NewsArticlePage item={item} commentSeed={buildCommentSeed(item.id)} />;
};

export default PulseNewsArticlePage;
