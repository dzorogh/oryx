"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Cake, Crown, FileBarChart2, HandHeart, Lightbulb, ListTodo, Medal, Newspaper, type LucideIcon } from "lucide-react";
import { HomeBlockShell, type HomeBlockAccent, type HomeBlockHeaderAction } from "@/components/home/home-block-shell";
import { HomeIdeasSection } from "@/components/home/home-ideas-section";
import { HomeNewsBlock } from "@/components/home/home-news-block";
import { HomeSalesLeadersBlock } from "@/components/home/home-sales-leaders-block";
import { HomeStatsSection } from "@/components/home/home-stats-section";
import { HomeThanksSection } from "@/components/home/home-thanks-section";
import { HomeBirthdaysSection } from "@/components/home/home-birthdays-section";
import { HomeTodayTasksSection } from "@/components/home/home-today-tasks-section";
import { HomeFavoriteReportsSection } from "@/components/home/home-favorite-reports-section";
import { Card, CardContent } from "@/components/ui/card";

type HomeBlockId = "stats" | "salesLeaders" | "news" | "ideas" | "thanks" | "birthdays" | "tasks" | "favoriteReports";

type HomeBlocksLayout = {
  order: HomeBlockId[];
  hidden: HomeBlockId[];
  collapsed: Record<HomeBlockId, boolean>;
};

type HomeBlockDefinition = {
  id: HomeBlockId;
  title: string;
  icon: LucideIcon;
  actions?: HomeBlockHeaderAction[];
  render: () => ReactNode;
};

const HOME_BLOCKS_LAYOUT_KEY = "home-blocks-layout-v2";
const LEFT_COLUMN_PRIORITY_BLOCKS: HomeBlockId[] = ["news", "salesLeaders", "stats", "tasks", "favoriteReports"];

const ACCENT_BY_BLOCK: Record<HomeBlockId, HomeBlockAccent> = {
  stats: "amber",
  salesLeaders: "amber",
  news: "violet",
  thanks: "teal",
  birthdays: "violet",
  tasks: "rose",
  ideas: "amber",
  favoriteReports: "amber",
};

const DEFAULT_LAYOUT: HomeBlocksLayout = {
  order: ["news", "birthdays", "stats", "favoriteReports", "salesLeaders", "tasks", "ideas", "thanks"],
  hidden: [],
  collapsed: {
    stats: false,
    salesLeaders: false,
    news: false,
    thanks: false,
    birthdays: false,
    tasks: false,
    ideas: false,
    favoriteReports: false,
  },
};

const isValidBlockId = (value: string): value is HomeBlockId =>
  value === "stats" ||
  value === "salesLeaders" ||
  value === "news" ||
  value === "thanks" ||
  value === "birthdays" ||
  value === "tasks" ||
  value === "ideas" ||
  value === "favoriteReports";

const normalizeLayout = (input: Partial<HomeBlocksLayout> | null): HomeBlocksLayout => {
  if (!input) {
    return DEFAULT_LAYOUT;
  }

  const order = Array.isArray(input.order) ? input.order.filter(isValidBlockId) : [];
  const hidden = Array.isArray(input.hidden) ? input.hidden.filter(isValidBlockId) : [];
  const collapsed: Partial<Record<HomeBlockId, boolean>> = input.collapsed ?? {};

  const missingIds = DEFAULT_LAYOUT.order.filter((id) => !order.includes(id) && !hidden.includes(id));
  return {
    order: [...order, ...missingIds],
    hidden,
    collapsed: {
      stats: collapsed.stats ?? false,
      salesLeaders: collapsed.salesLeaders ?? false,
      news: collapsed.news ?? false,
      thanks: collapsed.thanks ?? false,
      birthdays: collapsed.birthdays ?? false,
      tasks: collapsed.tasks ?? false,
      ideas: collapsed.ideas ?? false,
      favoriteReports: collapsed.favoriteReports ?? false,
    },
  };
};

export const PulseHomePage = () => {
  const [layout, setLayout] = useState<HomeBlocksLayout>(DEFAULT_LAYOUT);
  const [isLayoutLoading, setIsLayoutLoading] = useState(true);
  const [hiddenMenuOpen, setHiddenMenuOpen] = useState(false);

  useEffect(() => {
    let nextLayout = DEFAULT_LAYOUT;
    try {
      const raw = window.localStorage.getItem(HOME_BLOCKS_LAYOUT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<HomeBlocksLayout>;
        nextLayout = normalizeLayout(parsed);
      }
    } catch {
      // ignore invalid saved state and keep defaults
    }

    setTimeout(() => {
      setLayout(nextLayout);
      setIsLayoutLoading(false);
    }, 0);
  }, []);

  useEffect(() => {
    if (isLayoutLoading) {
      return;
    }
    window.localStorage.setItem(HOME_BLOCKS_LAYOUT_KEY, JSON.stringify(layout));
  }, [layout, isLayoutLoading]);

  const blockDefinitions = useMemo<HomeBlockDefinition[]>(
    () => [
      {
        id: "stats",
        title: "Statistics",
        icon: Crown,
        render: () => <HomeStatsSection />,
      },
      {
        id: "favoriteReports",
        title: "Favorite reports",
        icon: FileBarChart2,
        render: () => <HomeFavoriteReportsSection />,
      },
      {
        id: "salesLeaders",
        title: "Ranking",
        icon: Medal,
        render: () => null,
      },
      {
        id: "news",
        title: "News",
        icon: Newspaper,
        actions: [
          (props) => (
            <Link {...props} href="/pulse/news" aria-label="Go to all news">
              All news
            </Link>
          ),
        ],
        render: () => null,
      },
      {
        id: "thanks",
        title: "Say thanks",
        icon: HandHeart,
        actions: [
          (props) => (
            <Link {...props} href="/pulse/thanks" aria-label="Go to my thanks">
              My thanks
            </Link>
          ),
        ],
        render: () => <HomeThanksSection />,
      },
      {
        id: "birthdays",
        title: "Upcoming birthdays",
        icon: Cake,
        actions: [
          (props) => (
            <Link {...props} href="/team" aria-label="Go to team section">
              Team
            </Link>
          ),
        ],
        render: () => <HomeBirthdaysSection />,
      },
      {
        id: "tasks",
        title: "Today's tasks",
        icon: ListTodo,
        actions: [
          (props) => (
            <Link {...props} href="/tracker/tasks" aria-label="Go to all tasks">
              All tasks
            </Link>
          ),
        ],
        render: () => <HomeTodayTasksSection />,
      },
      {
        id: "ideas",
        title: "Ideas and suggestions",
        icon: Lightbulb,
        actions: [
          (props) => (
            <Link {...props} href="/pulse/ideas" aria-label="Go to all ideas">
              All ideas
            </Link>
          ),
        ],
        render: () => <HomeIdeasSection />,
      },
    ],
    [],
  );

  const blockById = useMemo(
    () => Object.fromEntries(blockDefinitions.map((block) => [block.id, block])) as Record<HomeBlockId, HomeBlockDefinition>,
    [blockDefinitions],
  );

  const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
  const leftColumnIds = useMemo(
    () => LEFT_COLUMN_PRIORITY_BLOCKS.filter((id) => visibleOrder.includes(id)),
    [visibleOrder],
  );
  const rightColumnIds = useMemo<HomeBlockId[]>(
    () => {
      const ids = visibleOrder.filter((id) => !LEFT_COLUMN_PRIORITY_BLOCKS.includes(id));
      if (!ids.includes("thanks")) {
        return ids;
      }
      return [...ids.filter((id) => id !== "thanks"), "thanks" as HomeBlockId];
    },
    [visibleOrder],
  );

  const handleHide = (blockId: HomeBlockId) => {
    setLayout((prev) => {
      if (prev.hidden.includes(blockId)) {
        return prev;
      }
      return {
        ...prev,
        hidden: [...prev.hidden, blockId],
      };
    });
  };

  const handleShow = (blockId: HomeBlockId) => {
    setLayout((prev) => ({
      ...prev,
      hidden: prev.hidden.filter((id) => id !== blockId),
    }));
    setHiddenMenuOpen(false);
  };

  const handleToggleCollapsed = (blockId: HomeBlockId) => {
    setLayout((prev) => ({
      ...prev,
      collapsed: {
        ...prev.collapsed,
        [blockId]: !prev.collapsed[blockId],
      },
    }));
  };

  const renderBlockCard = (blockId: HomeBlockId) => {
    const block = blockById[blockId];
    const shellProps = {
      title: block.title,
      icon: block.icon,
      accent: ACCENT_BY_BLOCK[block.id],
      actions: block.actions,
      collapsed: layout.collapsed[block.id],
      onHide: () => handleHide(block.id),
      onToggleCollapsed: () => handleToggleCollapsed(block.id),
    };

    if (blockId === "news") {
      return <HomeNewsBlock key={block.id} {...shellProps} />;
    }

    if (blockId === "salesLeaders") {
      return <HomeSalesLeadersBlock key={block.id} {...shellProps} />;
    }

    return (
      <HomeBlockShell key={block.id} {...shellProps}>
        {block.render()}
      </HomeBlockShell>
    );
  };

  return (
    <div className="flex min-h-full flex-col gap-5 p-5">
      {isLayoutLoading ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          <div className="space-y-5 xl:col-span-3">
            {LEFT_COLUMN_PRIORITY_BLOCKS.map((blockId) => (
              <Card key={`loader-left-${blockId}`} aria-label="Loading home block">
                <CardContent>
                  <div className="mb-4 h-6 w-56 animate-pulse rounded-md bg-muted" />
                  <div className="space-y-2">
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-5 xl:col-span-1">
            {DEFAULT_LAYOUT.order
              .filter((id) => !LEFT_COLUMN_PRIORITY_BLOCKS.includes(id))
              .map((blockId) => (
                <Card key={`loader-right-${blockId}`} aria-label="Loading home block">
                  <CardContent>
                    <div className="mb-4 h-6 w-56 animate-pulse rounded-md bg-muted" />
                    <div className="space-y-2">
                      <div className="h-16 animate-pulse rounded-lg bg-muted" />
                      <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            <div className="space-y-5 xl:col-span-3">
              {leftColumnIds.map((blockId) => renderBlockCard(blockId))}
            </div>
            <div className="space-y-5 xl:col-span-1">
              {rightColumnIds.map((blockId) => renderBlockCard(blockId))}
            </div>
          </div>

          {layout.hidden.length > 0 ? (
            <div className="self-end">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHiddenMenuOpen((prev) => !prev)}
                  className="inline-flex items-center rounded-lg border border-[var(--corportal-border-grey)] bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
                  aria-expanded={hiddenMenuOpen}
                  aria-label="Show hidden blocks"
                >
                  Hidden blocks ({layout.hidden.length})
                </button>
                {hiddenMenuOpen ? (
                  <div className="absolute bottom-12 right-0 z-20 min-w-52 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-1 shadow-sm">
                    {layout.hidden.map((blockId) => (
                      <button
                        key={blockId}
                        type="button"
                        onClick={() => handleShow(blockId)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
                      >
                        <span>{blockById[blockId].title}</span>
                        <span className="text-xs text-muted-foreground">Show</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
