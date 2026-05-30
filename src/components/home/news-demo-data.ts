/** Рубрика материала (значение «all» используется только в фильтрах, не в данных). */
export type NewsItemRubric = Exclude<NewsRubric, "all">;

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  publishedAt: string;
  likes: number;
  rubric: NewsItemRubric;
};

export type NewsRubric = "all" | "it" | "company" | "hr" | "logistics";

export const NEWS_RUBRIC_LABELS: Record<Exclude<NewsRubric, "all">, string> = {
  it: "IT",
  company: "Company",
  hr: "HR",
  logistics: "Logistics",
};

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: "news-1",
    title: "IT Department will accept all requests exclusively through the Service Desk system",
    excerpt: "Starting in September, all IT requests are accepted only through Service Desk — no exceptions.",
    imageUrl: "https://loremflickr.com/1600/900/support,office?lock=1",
    publishedAt: "1 hr ago",
    likes: 120,
    rubric: "it",
  },
  {
    id: "news-2",
    title: "IT News: September 2025",
    excerpt: "Overview of releases, incidents, and team plans for the month.",
    imageUrl: "https://loremflickr.com/1600/900/technology,computer?lock=2",
    publishedAt: "2 hr ago",
    likes: 127,
    rubric: "company",
  },
  {
    id: "news-3",
    title: "GLOBADRIVE Team's Furry Friends",
    excerpt: "Photos and stories about colleagues' pets: get to know the team better.",
    imageUrl: "https://loremflickr.com/1600/900/pet,dog?lock=3",
    publishedAt: "3 hr ago",
    likes: 134,
    rubric: "hr",
  },
  {
    id: "news-4",
    title: "New season of the corporate motorcycle club is now open",
    excerpt: "Season registration is open; ride and meetup schedule is in the calendar.",
    imageUrl: "https://loremflickr.com/1600/900/motorcycle,road?lock=4",
    publishedAt: "4 hr ago",
    likes: 141,
    rubric: "logistics",
  },
  {
    id: "news-5",
    title: "Information security policy update",
    excerpt: "What changed in password, access, and work device requirements.",
    imageUrl: "https://loremflickr.com/1600/900/security,computer?lock=5",
    publishedAt: "5 hr ago",
    likes: 148,
    rubric: "it",
  },
  {
    id: "news-6",
    title: "New maintenance schedule for the weekend",
    excerpt: "Maintenance windows have shifted; check whether this affects your tasks.",
    imageUrl: "https://loremflickr.com/1600/900/computer,office?lock=6",
    publishedAt: "6 hr ago",
    likes: 155,
    rubric: "company",
  },
  {
    id: "news-7",
    title: "Internal data analytics course launched",
    excerpt: "SQL and visualization workshop: limited seats, sign up via internal link.",
    imageUrl: "https://loremflickr.com/1600/900/data,computer?lock=7",
    publishedAt: "1 hr ago",
    likes: 162,
    rubric: "hr",
  },
  {
    id: "news-8",
    title: "Logistics team finished the quarter with a record",
    excerpt: "Quarter results and thanks to the team for stable deliveries.",
    imageUrl: "https://loremflickr.com/1600/900/warehouse,truck?lock=8",
    publishedAt: "2 hr ago",
    likes: 169,
    rubric: "logistics",
  },
  {
    id: "news-9",
    title: "New document templates available in the catalog",
    excerpt: "Unified forms will speed up approvals and reduce revisions.",
    imageUrl: "https://loremflickr.com/1600/900/document,office?lock=9",
    publishedAt: "3 hr ago",
    likes: 176,
    rubric: "it",
  },
  {
    id: "news-10",
    title: "Employee mobile app release",
    excerpt: "What's new: notifications, offline mode, and quick actions.",
    imageUrl: "https://loremflickr.com/1600/900/mobile,smartphone?lock=10",
    publishedAt: "4 hr ago",
    likes: 183,
    rubric: "company",
  },
  {
    id: "news-11",
    title: "Partial migration of services to new infrastructure",
    excerpt: "Migration will proceed in phases; schedule and FAQ published in the knowledge base.",
    imageUrl: "https://loremflickr.com/1600/900/cloud,computer?lock=11",
    publishedAt: "5 hr ago",
    likes: 190,
    rubric: "hr",
  },
  {
    id: "news-12",
    title: "Mentorship program for new colleagues launched",
    excerpt: "Mentor–newcomer pairs: how to sign up and what to expect from the program.",
    imageUrl: "https://loremflickr.com/1600/900/teamwork,people?lock=12",
    publishedAt: "6 hr ago",
    likes: 197,
    rubric: "logistics",
  },
  {
    id: "news-13",
    title: "Service Desk ticket SLAs updated",
    excerpt: "Response and escalation timelines updated; table available in Confluence.",
    imageUrl: "https://loremflickr.com/1600/900/support,computer?lock=13",
    publishedAt: "1 hr ago",
    likes: 204,
    rubric: "it",
  },
  {
    id: "news-14",
    title: "New collaborative workspace opened in the office",
    excerpt: "Coworking with hourly meeting rooms: book via the internal portal.",
    imageUrl: "https://loremflickr.com/1600/900/office,workspace?lock=14",
    publishedAt: "2 hr ago",
    likes: 211,
    rubric: "company",
  },
  {
    id: "news-15",
    title: "Platform development plan for the quarter approved",
    excerpt: "Product development priorities and cross-team dependencies.",
    imageUrl: "https://loremflickr.com/1600/900/meeting,business?lock=15",
    publishedAt: "3 hr ago",
    likes: 218,
    rubric: "hr",
  },
  {
    id: "news-16",
    title: "New dashboards for managers implemented",
    excerpt: "Single entry point to department and subsidiary metrics.",
    imageUrl: "https://loremflickr.com/1600/900/analytics,business?lock=16",
    publishedAt: "4 hr ago",
    likes: 225,
    rubric: "logistics",
  },
  {
    id: "news-17",
    title: "QA team expanding regression test suite",
    excerpt: "Regression coverage is growing; connect your services to the pipeline.",
    imageUrl: "https://loremflickr.com/1600/900/developer,computer?lock=17",
    publishedAt: "5 hr ago",
    likes: 232,
    rubric: "it",
  },
  {
    id: "news-18",
    title: "New supplier regulations published",
    excerpt: "Document takes effect on the specified date; review the appendices.",
    imageUrl: "https://loremflickr.com/1600/900/contract,document?lock=18",
    publishedAt: "6 hr ago",
    likes: 239,
    rubric: "company",
  },
  {
    id: "news-19",
    title: "Business process knowledge base updated",
    excerpt: "Article structure and tag search are easier for daily work.",
    imageUrl: "https://loremflickr.com/1600/900/library,book?lock=19",
    publishedAt: "1 hr ago",
    likes: 246,
    rubric: "hr",
  },
  {
    id: "news-20",
    title: "Scheduled systems audit completed successfully",
    excerpt: "No critical findings; management report attached.",
    imageUrl: "https://loremflickr.com/1600/900/security,business?lock=20",
    publishedAt: "2 hr ago",
    likes: 253,
    rubric: "logistics",
  },
];
