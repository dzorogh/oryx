"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Cake, Crown, FileBarChart2, HandHeart, Lightbulb, ListTodo, Medal, Newspaper, type LucideIcon } from "lucide-react";
import { HomeBlockShell, type HomeBlockAccent, type HomeBlockHeaderAction } from "@/components/home/home-block-shell";
import { HomeIdeasSection } from "@/components/home/home-ideas-section";
import { HomeNewsSection } from "@/components/home/home-news-section";
import { HomeSalesLeadersSection } from "@/components/home/home-sales-leaders-section";
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

const HomePage = () => {
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
        title: "Статистика",
        icon: Crown,
        render: () => <HomeStatsSection />,
      },
      {
        id: "favoriteReports",
        title: "Избранные отчёты",
        icon: FileBarChart2,
        render: () => <HomeFavoriteReportsSection />,
      },
      {
        id: "salesLeaders",
        title: "Рейтинг",
        icon: Medal,
        render: () => <HomeSalesLeadersSection />,
      },
      {
        id: "news",
        title: "Новости",
        icon: Newspaper,
        actions: [
          (props) => (
            <Link {...props} href="/pulse/news" aria-label="Перейти ко всем новостям">
              Все новости
            </Link>
          ),
        ],
        render: () => <HomeNewsSection />,
      },
      {
        id: "thanks",
        title: "Хочу сказать спасибо",
        icon: HandHeart,
        actions: [
          (props) => (
            <Link {...props} href="/thanks" aria-label="Перейти к моим благодарностям">
              Мои благодарности
            </Link>
          ),
        ],
        render: () => <HomeThanksSection />,
      },
      {
        id: "birthdays",
        title: "Ближайшие дни рождения",
        icon: Cake,
        actions: [
          (props) => (
            <Link {...props} href="/team" aria-label="Перейти к разделу команда">
              Команда
            </Link>
          ),
        ],
        render: () => <HomeBirthdaysSection />,
      },
      {
        id: "tasks",
        title: "Задачи на сегодня",
        icon: ListTodo,
        actions: [
          (props) => (
            <Link {...props} href="/tasks" aria-label="Перейти ко всем задачам">
              Все задачи
            </Link>
          ),
        ],
        render: () => <HomeTodayTasksSection />,
      },
      {
        id: "ideas",
        title: "Идеи и предложения",
        icon: Lightbulb,
        actions: [
          (props) => (
            <Link {...props} href="/pulse/ideas" aria-label="Перейти ко всем идеям">
              Все идеи
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

  const handleMove = (blockId: HomeBlockId, direction: "up" | "down") => {
    setLayout((prev) => {
      const currentIndex = prev.order.indexOf(blockId);
      if (currentIndex === -1) {
        return prev;
      }
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.order.length) {
        return prev;
      }
      const nextOrder = [...prev.order];
      [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
      return {
        ...prev,
        order: nextOrder,
      };
    });
  };

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

  return (
    <main className="min-h-screen pl-0 sm:pl-12">
      <div className="flex min-h-screen flex-col gap-5 p-5">
        {isLayoutLoading ? (
          <>
            {DEFAULT_LAYOUT.order.map((blockId) => (
              <Card key={`loader-${blockId}`} aria-label="Загрузка блока главной">
                <CardContent>
                  <div className="mb-4 h-6 w-56 animate-pulse rounded-md bg-muted" />
                  <div className="space-y-2">
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            {visibleOrder.map((blockId, visibleIndex) => {
              const block = blockById[blockId];
              return (
                <HomeBlockShell
                  key={block.id}
                  title={block.title}
                  icon={block.icon}
                  accent={ACCENT_BY_BLOCK[block.id]}
                  actions={block.actions}
                  collapsed={layout.collapsed[block.id]}
                  canMoveUp={visibleIndex > 0}
                  canMoveDown={visibleIndex < visibleOrder.length - 1}
                  onHide={() => handleHide(block.id)}
                  onMoveUp={() => handleMove(block.id, "up")}
                  onMoveDown={() => handleMove(block.id, "down")}
                  onToggleCollapsed={() => handleToggleCollapsed(block.id)}
                >
                  {block.render()}
                </HomeBlockShell>
              );
            })}

            {layout.hidden.length > 0 ? (
              <div className="self-end">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setHiddenMenuOpen((prev) => !prev)}
                    className="inline-flex items-center rounded-lg border border-[var(--corportal-border-grey)] bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
                    aria-expanded={hiddenMenuOpen}
                    aria-label="Показать скрытые блоки"
                  >
                    Скрытые блоки ({layout.hidden.length})
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
                          <span className="text-xs text-muted-foreground">Показать</span>
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
    </main>
  );
};

export default HomePage;
