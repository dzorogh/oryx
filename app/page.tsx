import { HomeIdeasSection } from "@/components/home/home-ideas-section";
import { HomeNewsSection } from "@/components/home/home-news-section";
import { HomeOverviewGrid } from "@/components/home/home-overview-grid";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--corportal-surface-muted)] pl-12">
      <div className="flex min-h-screen flex-col gap-5 p-5">
        <HomeNewsSection />
        <HomeIdeasSection />
        <HomeOverviewGrid />
      </div>
    </main>
  );
}
