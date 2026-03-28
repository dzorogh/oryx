"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type SearchTarget = {
  id: string;
  title: string;
  description: string;
  href: string;
};

const SEARCH_TARGETS: SearchTarget[] = [
  { id: "home", title: "Главная", description: "Основной дашборд", href: "/" },
  { id: "orders", title: "Упаковка и заказы", description: "Раздел заказов PIM", href: "/pim/orders/59" },
  { id: "pulse", title: "Пульс компании", description: "Новости и обновления команды", href: "/pulse/news" },
  { id: "ideas", title: "Идеи и предложения", description: "Лента идей сотрудников", href: "/pulse/ideas" },
  { id: "team", title: "Команда", description: "Модуль команды и оргструктуры", href: "/team" },
  { id: "team-users", title: "Сотрудники", description: "Список пользователей команды", href: "/team/users" },
  { id: "activity", title: "Активность", description: "События и уведомления", href: "/activity" },
  { id: "approvals", title: "Согласования", description: "Задачи на согласование", href: "/approvals" },
  { id: "catalog", title: "Каталог", description: "Справочник и каталог", href: "/catalog" },
  { id: "learning", title: "Обучение", description: "Материалы и курсы", href: "/learning" },
  { id: "help", title: "Справка", description: "Документация и помощь", href: "/help" },
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

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return SEARCH_TARGETS;
    }
    return SEARCH_TARGETS.filter((target) =>
      `${target.title} ${target.description}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Глобальный поиск</DialogTitle>
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

        <div className="mt-3 max-h-80 overflow-y-auto">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
