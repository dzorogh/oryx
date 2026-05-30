import { notFound } from "next/navigation";
import { SectionPlaceholderPage } from "@/components/home/section-placeholder-page";

type SectionConfig = {
  title: string;
  description: string;
};

const SECTION_CONFIGS: Record<string, SectionConfig> = {
  activity: {
    title: "Activity",
    description: "The activity section is ready for data and widget integration.",
  },
  catalog: {
    title: "Catalog",
    description: "The catalog section is prepared for content integration.",
  },
  help: {
    title: "Help",
    description: "Knowledge base, guides, and support contacts will appear here.",
  },
  profile: {
    title: "Profile",
    description: "The user profile page is ready for account data integration.",
  },
  search: {
    title: "Search",
    description: "The search section is ready for system-wide global search integration.",
  },
  services: {
    title: "Services",
    description: "The services section is ready for internal tools.",
  },
};

export const generateStaticParams = () => Object.keys(SECTION_CONFIGS).map((section) => ({ section }));

export const dynamicParams = false;

type SectionPageProps = {
  params: Promise<{ section: string }>;
};

const SectionPage = async ({ params }: SectionPageProps) => {
  const { section } = await params;
  const config = SECTION_CONFIGS[section];
  if (!config) {
    notFound();
  }

  return <SectionPlaceholderPage title={config.title} description={config.description} />;
};

export default SectionPage;
