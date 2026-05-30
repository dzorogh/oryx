export type IdeaStatus = "new" | "review";

/** Подписи и классы бейджей статуса (без бордера, цветные фоны из палитры Corportal). */
export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  new: "New",
  review: "Under review",
};

export const IDEA_STATUS_BADGE_CLASS: Record<IdeaStatus, string> = {
  new: "bg-corportal-idea-status-new-bg text-corportal-idea-status-new-fg",
  review: "bg-corportal-idea-status-review-bg text-corportal-idea-status-review-fg",
};

export type IdeaItem = {
  id: string;
  title: string;
  author: string;
  status: IdeaStatus;
  likes: number;
  comments: number;
  createdAt: string;
};

const IDEA_TITLES = [
  "Add a unified order status dashboard",
  "Reduce approval time with decision templates",
  "Introduce quick search for customer records",
  "Add auto-archiving for outdated requests",
  "Show SLA risk before overdue in task list",
  "Enable one-click packing report export",
  "Add bulk editing for order records",
  "Highlight conflicting changes in approvals",
  "Consolidate order change feed in one block",
  "Create comment templates for common cases",
  "Add quick filters by region and warehouse",
  "Show team workload in real time",
  "Simplify request form to 4 steps",
  "Add Telegram notifications for critical statuses",
  "Visualize weekly SLA dips",
  "Introduce auto-assignment by rules",
  "Add usefulness rating for internal articles",
  "Build a library of standard business processes",
];

const AUTHORS = [
  "Anna Petrova",
  "Ilya Smirnov",
  "Maria Sokolova",
  "Dmitry Volkov",
  "Olga Vlasova",
  "Kirill Orlov",
];

export const IDEAS_ITEMS: IdeaItem[] = IDEA_TITLES.map((title, index) => ({
  id: `idea-${index + 1}`,
  title,
  author: AUTHORS[index % AUTHORS.length],
  status: index % 3 === 0 ? "new" : "review",
  likes: 18 + index * 5,
  comments: 2 + (index % 7),
  createdAt: `${(index % 5) + 1} hr ago`,
}));
