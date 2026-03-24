"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { ScrollableRegion } from "@/components/layout/scrollable-region";

type SearchTarget = {
  id: string;
  title: string;
  description: string;
  href: string;
};

const SEARCH_TARGETS: SearchTarget[] = [
  { id: "home", title: "Главная", description: "Основной дашборд", href: "/" },
  { id: "orders", title: "Упаковка и заказы", description: "Раздел заказов PIM", href: "/pim/orders/59" },
  { id: "ideas", title: "Идеи и предложения", description: "Лента идей сотрудников", href: "/pulse/ideas" },
  { id: "team", title: "Команда", description: "Сотрудники и роли", href: "/team" },
  { id: "activity", title: "Активность", description: "События и уведомления", href: "/activity" },
  { id: "approvals", title: "Согласования", description: "Задачи на согласование", href: "/approvals" },
  { id: "catalog", title: "Каталог", description: "Справочник и каталог", href: "/catalog" },
  { id: "services", title: "Сервисы", description: "Внутренние инструменты", href: "/services" },
];

type GlobalSearchModalProps = {
  open: boolean;
  onClose: () => void;
};

export const GlobalSearchModal = ({ open, onClose }: GlobalSearchModalProps) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      setQuery("");
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return SEARCH_TARGETS;
    }
    return SEARCH_TARGETS.filter((target) =>
      `${target.title} ${target.description}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16" role="dialog" aria-modal="true" aria-label="Глобальный поиск">
      <div className="w-full max-w-3xl rounded-xl border border-[var(--corportal-border-grey)] bg-card p-3 shadow-lg">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2">
          <Search aria-hidden className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти раздел, страницу или действие..."
            className="w-full bg-transparent text-sm text-foreground outline-none"
            aria-label="Введите запрос для глобального поиска"
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Закрыть поиск"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <ScrollableRegion className="mt-3 max-h-80">
          {results.length === 0 ? (
            <p className="rounded-lg px-3 py-2 text-sm text-muted-foreground">Ничего не найдено.</p>
          ) : (
            results.map((result) => (
              <Link
                key={result.id}
                href={result.href}
                onClick={onClose}
                className="flex flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                aria-label={`Открыть ${result.title}`}
              >
                <span className="text-sm font-medium text-foreground">{result.title}</span>
                <span className="text-xs text-muted-foreground">{result.description}</span>
              </Link>
            ))
          )}
        </ScrollableRegion>
      </div>
    </div>
  );
};
