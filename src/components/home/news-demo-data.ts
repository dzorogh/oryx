/** Рубрика материала (значение «all» используется только в фильтрах, не в данных). */
export type NewsItemRubric = Exclude<NewsRubric, "all">;

export type NewsRubric = "all" | "it" | "company" | "hr" | "logistics";

export const NEWS_RUBRIC_LABELS: Record<Exclude<NewsRubric, "all">, string> = {
  it: "IT",
  company: "Company",
  hr: "HR",
  logistics: "Logistics",
};

/** Блоки тела статьи для детальной страницы новости. */
export type NewsBlock =
  | { type: "heading"; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string; cite: string }
  | { type: "list"; items: string[] };

export type NewsAuthor = {
  name: string;
  role: string;
  avatarUrl: string;
};

export type NewsComment = {
  id: string;
  author: string;
  role: string;
  avatarUrl: string;
  timeAgo: string;
  text: string;
  likes: number;
};

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  publishedAt: string;
  publishedDate: string;
  readingMinutes: number;
  author: NewsAuthor;
  body: NewsBlock[];
  comments: number;
  commentThread: NewsComment[];
  likes: number;
  href: string;
  rubric: NewsItemRubric;
};

/** Базовая запись ленты до обогащения телом статьи и автором. */
type NewsSeed = {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  publishedDate: string;
  likes: number;
  comments: number;
  rubric: NewsItemRubric;
};

/** Авторы по рубрикам — подпись выглядит осмысленно на детальной странице. */
const RUBRIC_AUTHORS: Record<NewsItemRubric, NewsAuthor> = {
  it: {
    name: "Dmitry Sokolov",
    role: "IT Operations Lead",
    avatarUrl: "https://i.pravatar.cc/160?u=news-dmitry-sokolov",
  },
  company: {
    name: "Anna Petrova",
    role: "Internal Communications",
    avatarUrl: "https://i.pravatar.cc/160?u=news-anna-petrova",
  },
  hr: {
    name: "Maria Egorova",
    role: "People & Culture",
    avatarUrl: "https://i.pravatar.cc/160?u=news-maria-egorova",
  },
  logistics: {
    name: "Pavel Gromov",
    role: "Logistics Director",
    avatarUrl: "https://i.pravatar.cc/160?u=news-pavel-gromov",
  },
};

const RUBRIC_CONTEXT: Record<NewsItemRubric, string> = {
  it: "the engineering and IT operations teams",
  company: "every department across the company",
  hr: "people managers and their teams",
  logistics: "the logistics and delivery network",
};

/** Демо-комментарии — переиспользуются в потоке каждой новости. */
const COMMENT_POOL: Omit<NewsComment, "id">[] = [
  {
    author: "Olga Vlasova",
    role: "Project Manager",
    avatarUrl: "https://i.pravatar.cc/96?u=news-comment-olga",
    timeAgo: "32 min ago",
    text: "Clear and to the point — thanks for sharing this ahead of the rollout. Looking forward to the details.",
    likes: 14,
  },
  {
    author: "Kirill Orlov",
    role: "Backend Engineer",
    avatarUrl: "https://i.pravatar.cc/96?u=news-comment-kirill",
    timeAgo: "1 hr ago",
    text: "Will there be a recording or a short FAQ for those who can't attend the kickoff session?",
    likes: 9,
  },
  {
    author: "Elena Belova",
    role: "HR Business Partner",
    avatarUrl: "https://i.pravatar.cc/96?u=news-comment-elena",
    timeAgo: "2 hr ago",
    text: "Great to see this finally happening. I'll forward it to my team so everyone is on the same page.",
    likes: 7,
  },
  {
    author: "Roman Zakharov",
    role: "QA Lead",
    avatarUrl: "https://i.pravatar.cc/96?u=news-comment-roman",
    timeAgo: "3 hr ago",
    text: "One question: does this change affect the existing process for urgent requests, or only the regular flow?",
    likes: 5,
  },
  {
    author: "Tatyana Lebedeva",
    role: "Product Analyst",
    avatarUrl: "https://i.pravatar.cc/96?u=news-comment-tatyana",
    timeAgo: "5 hr ago",
    text: "Bookmarked. The step-by-step section makes it really easy to follow. Nicely written.",
    likes: 4,
  },
];

const buildCommentThread = (newsId: string): NewsComment[] =>
  COMMENT_POOL.map((comment, index) => ({
    ...comment,
    id: `${newsId}-comment-${index + 1}`,
  }));

/** Простая оценка времени чтения по количеству слов (≈200 слов/мин). */
const estimateReadingMinutes = (blocks: NewsBlock[]): number => {
  const words = blocks.reduce((total, block) => {
    if (block.type === "list") {
      return total + block.items.join(" ").split(/\s+/).length;
    }
    if (block.type === "heading") {
      return total + block.text.split(/\s+/).length;
    }
    return total + block.text.split(/\s+/).length;
  }, 0);
  return Math.max(2, Math.round(words / 200));
};

/** Генерирует осмысленное тело статьи на основе заголовка/анонса и рубрики. */
const buildBody = (seed: NewsSeed): NewsBlock[] => {
  const audience = RUBRIC_CONTEXT[seed.rubric];
  return [
    {
      type: "paragraph",
      text: `${seed.excerpt} This update matters for ${audience}, and we want to make sure the context, timing, and next steps are clear before anything changes in your day-to-day work.`,
    },
    {
      type: "heading",
      id: "whats-changing",
      text: "What's changing",
    },
    {
      type: "paragraph",
      text: "We have been preparing this change for several weeks together with the teams it affects most. The goal is to remove friction from a process that many of you rely on every day, while keeping the parts that already work well untouched.",
    },
    {
      type: "paragraph",
      text: "Nothing happens overnight. The rollout is staged so that each team has time to adapt, ask questions, and give feedback. If you spot anything that looks off during the transition, you can reach the responsible team directly through the usual channels.",
    },
    {
      type: "quote",
      text: "We are not adding process for its own sake — we are removing the steps that slow people down and keeping the ones that protect quality.",
      cite: RUBRIC_AUTHORS[seed.rubric].name,
    },
    {
      type: "heading",
      id: "what-to-do",
      text: "What you need to do",
    },
    {
      type: "paragraph",
      text: "For most people the practical impact is small, but a few habits are worth adopting early so the transition feels smooth:",
    },
    {
      type: "list",
      items: [
        "Review the summary above and note the date the change takes effect.",
        "Update any saved links, templates, or bookmarks that point to the old flow.",
        "Share this article with teammates who handle related requests.",
        "Send questions to the responsible team rather than improvising a workaround.",
      ],
    },
    {
      type: "heading",
      id: "next-steps",
      text: "Next steps",
    },
    {
      type: "paragraph",
      text: "We will publish a short follow-up with answers to the most common questions once the first teams are onboarded. In the meantime, this article will stay up to date — check back if you need the latest version of the details.",
    },
  ];
};

const NEWS_SEEDS: NewsSeed[] = [
  {
    id: "news-1",
    title: "IT Department will accept all requests exclusively through the Service Desk system",
    excerpt: "Starting in September, all IT requests are accepted only through Service Desk — no exceptions.",
    publishedAt: "1 hr ago",
    publishedDate: "September 2, 2025",
    likes: 120,
    comments: 18,
    rubric: "it",
  },
  {
    id: "news-2",
    title: "IT News: September 2025",
    excerpt: "Overview of releases, incidents, and team plans for the month.",
    publishedAt: "2 hr ago",
    publishedDate: "September 1, 2025",
    likes: 127,
    comments: 19,
    rubric: "company",
  },
  {
    id: "news-3",
    title: "GLOBADRIVE Team's Furry Friends",
    excerpt: "Photos and stories about colleagues' pets: get to know the team better.",
    publishedAt: "3 hr ago",
    publishedDate: "August 30, 2025",
    likes: 134,
    comments: 20,
    rubric: "hr",
  },
  {
    id: "news-4",
    title: "New season of the corporate motorcycle club is now open",
    excerpt: "Season registration is open; ride and meetup schedule is in the calendar.",
    publishedAt: "4 hr ago",
    publishedDate: "August 29, 2025",
    likes: 141,
    comments: 21,
    rubric: "logistics",
  },
  {
    id: "news-5",
    title: "Information security policy update",
    excerpt: "What changed in password, access, and work device requirements.",
    publishedAt: "5 hr ago",
    publishedDate: "August 28, 2025",
    likes: 148,
    comments: 22,
    rubric: "it",
  },
  {
    id: "news-6",
    title: "New maintenance schedule for the weekend",
    excerpt: "Maintenance windows have shifted; check whether this affects your tasks.",
    publishedAt: "6 hr ago",
    publishedDate: "August 27, 2025",
    likes: 155,
    comments: 23,
    rubric: "company",
  },
  {
    id: "news-7",
    title: "Internal data analytics course launched",
    excerpt: "SQL and visualization workshop: limited seats, sign up via internal link.",
    publishedAt: "1 hr ago",
    publishedDate: "August 26, 2025",
    likes: 162,
    comments: 24,
    rubric: "hr",
  },
  {
    id: "news-8",
    title: "Logistics team finished the quarter with a record",
    excerpt: "Quarter results and thanks to the team for stable deliveries.",
    publishedAt: "2 hr ago",
    publishedDate: "August 25, 2025",
    likes: 169,
    comments: 25,
    rubric: "logistics",
  },
  {
    id: "news-9",
    title: "New document templates available in the catalog",
    excerpt: "Unified forms will speed up approvals and reduce revisions.",
    publishedAt: "3 hr ago",
    publishedDate: "August 24, 2025",
    likes: 176,
    comments: 26,
    rubric: "it",
  },
  {
    id: "news-10",
    title: "Employee mobile app release",
    excerpt: "What's new: notifications, offline mode, and quick actions.",
    publishedAt: "4 hr ago",
    publishedDate: "August 23, 2025",
    likes: 183,
    comments: 27,
    rubric: "company",
  },
  {
    id: "news-11",
    title: "Partial migration of services to new infrastructure",
    excerpt: "Migration will proceed in phases; schedule and FAQ published in the knowledge base.",
    publishedAt: "5 hr ago",
    publishedDate: "August 22, 2025",
    likes: 190,
    comments: 29,
    rubric: "hr",
  },
  {
    id: "news-12",
    title: "Mentorship program for new colleagues launched",
    excerpt: "Mentor–newcomer pairs: how to sign up and what to expect from the program.",
    publishedAt: "6 hr ago",
    publishedDate: "August 21, 2025",
    likes: 197,
    comments: 30,
    rubric: "logistics",
  },
  {
    id: "news-13",
    title: "Service Desk ticket SLAs updated",
    excerpt: "Response and escalation timelines updated; table available in Confluence.",
    publishedAt: "1 hr ago",
    publishedDate: "August 20, 2025",
    likes: 204,
    comments: 31,
    rubric: "it",
  },
  {
    id: "news-14",
    title: "New collaborative workspace opened in the office",
    excerpt: "Coworking with hourly meeting rooms: book via the internal portal.",
    publishedAt: "2 hr ago",
    publishedDate: "August 19, 2025",
    likes: 211,
    comments: 32,
    rubric: "company",
  },
  {
    id: "news-15",
    title: "Platform development plan for the quarter approved",
    excerpt: "Product development priorities and cross-team dependencies.",
    publishedAt: "3 hr ago",
    publishedDate: "August 18, 2025",
    likes: 218,
    comments: 33,
    rubric: "hr",
  },
  {
    id: "news-16",
    title: "New dashboards for managers implemented",
    excerpt: "Single entry point to department and subsidiary metrics.",
    publishedAt: "4 hr ago",
    publishedDate: "August 17, 2025",
    likes: 225,
    comments: 34,
    rubric: "logistics",
  },
  {
    id: "news-17",
    title: "QA team expanding regression test suite",
    excerpt: "Regression coverage is growing; connect your services to the pipeline.",
    publishedAt: "5 hr ago",
    publishedDate: "August 16, 2025",
    likes: 232,
    comments: 35,
    rubric: "it",
  },
  {
    id: "news-18",
    title: "New supplier regulations published",
    excerpt: "Document takes effect on the specified date; review the appendices.",
    publishedAt: "6 hr ago",
    publishedDate: "August 15, 2025",
    likes: 239,
    comments: 36,
    rubric: "company",
  },
  {
    id: "news-19",
    title: "Business process knowledge base updated",
    excerpt: "Article structure and tag search are easier for daily work.",
    publishedAt: "1 hr ago",
    publishedDate: "August 14, 2025",
    likes: 246,
    comments: 37,
    rubric: "hr",
  },
  {
    id: "news-20",
    title: "Scheduled systems audit completed successfully",
    excerpt: "No critical findings; management report attached.",
    publishedAt: "2 hr ago",
    publishedDate: "August 13, 2025",
    likes: 253,
    comments: 38,
    rubric: "logistics",
  },
];

const enrichSeed = (seed: NewsSeed): NewsItem => {
  const body = buildBody(seed);
  return {
    ...seed,
    imageUrl: `https://picsum.photos/seed/oryx-${seed.id}/1600/900`,
    href: `/pulse/news/${seed.id}`,
    author: RUBRIC_AUTHORS[seed.rubric],
    readingMinutes: estimateReadingMinutes(body),
    body,
    commentThread: buildCommentThread(seed.id),
  };
};

export const NEWS_ITEMS: NewsItem[] = NEWS_SEEDS.map(enrichSeed);

const NEWS_BY_ID = new Map(NEWS_ITEMS.map((item) => [item.id, item]));

export const getNewsItemById = (id: string): NewsItem | undefined => NEWS_BY_ID.get(id);

/** Похожие материалы: та же рубрика, исключая текущую новость. */
export const getRelatedNews = (item: NewsItem, limit = 3): NewsItem[] => {
  const sameRubric = NEWS_ITEMS.filter(
    (candidate) => candidate.id !== item.id && candidate.rubric === item.rubric,
  );
  if (sameRubric.length >= limit) {
    return sameRubric.slice(0, limit);
  }
  const fillers = NEWS_ITEMS.filter(
    (candidate) => candidate.id !== item.id && candidate.rubric !== item.rubric,
  );
  return [...sameRubric, ...fillers].slice(0, limit);
};

export const getPopularNews = (limit = 5): NewsItem[] =>
  [...NEWS_ITEMS].sort((a, b) => b.likes - a.likes).slice(0, limit);
