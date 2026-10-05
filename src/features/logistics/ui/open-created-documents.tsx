"use client";

import { toast } from "sonner";
import { notifyLogisticsChanged } from "@/features/logistics/use-logistics-store";

export type CreatedDocLink = {
  href: string;
  label: string;
};

/** «… и закрыть» оставляет пользователя на месте, «… и открыть» ведёт в созданную сущность. */
export type CreateIntent = "close" | "open";

const docLinks = (navigate: (href: string) => void, items: CreatedDocLink[]) =>
  items.length > 0 ? (
    <span className="mt-1 flex flex-col items-start gap-1">
      {items.map((item) => (
        <button
          key={item.href}
          type="button"
          className="text-left underline"
          onClick={() => navigate(item.href)}
        >
          {item.label}
        </button>
      ))}
    </span>
  ) : undefined;

const openAction = (navigate: (href: string) => void, main: CreatedDocLink) => ({
  label: "Открыть",
  onClick: () => navigate(main.href),
});

/** Часть документов уже создана: закрыть окно, открыть первый (или дать ссылку) и назвать сбой. */
export const reportPartialCreate = async (
  navigate: (href: string) => void,
  created: CreatedDocLink[],
  failed: string,
  reload?: () => Promise<void>,
  intent: CreateIntent = "open",
) => {
  const [main, ...rest] = created;
  if (!main) return;
  if (reload) await reload();
  else if (intent === "close") notifyLogisticsChanged();
  const createdNames = [main, ...rest].map((item) => item.label).join(", ");
  toast.error("Создано не всё", {
    description: `Создано: ${createdNames}. Не удалось: ${failed}`,
    action: intent === "close" ? openAction(navigate, main) : undefined,
  });
  if (intent === "open") navigate(main.href);
};

/** Открывает главный документ. Остальные — ссылками в тосте. */
export const openCreatedDocuments = (
  navigate: (href: string) => void,
  main: CreatedDocLink,
  rest: CreatedDocLink[] = [],
) => {
  if (rest.length > 0) {
    toast.success("Созданы документы", { description: docLinks(navigate, rest) });
  }
  navigate(main.href);
};

/**
 * Завершает создание по выбранной кнопке. «Открыть» — как `openCreatedDocuments`.
 * «Закрыть» — обновляет текущую страницу (`refresh` или все логистические сторы) и даёт ссылки в тосте.
 */
export const finishCreatedDocuments = async ({
  intent,
  navigate,
  main,
  rest = [],
  message,
  refresh,
}: {
  intent: CreateIntent;
  navigate: (href: string) => void;
  main: CreatedDocLink;
  rest?: CreatedDocLink[];
  message: string;
  refresh?: () => Promise<void>;
}) => {
  if (intent === "open") {
    openCreatedDocuments(navigate, main, rest);
    return;
  }
  if (refresh) await refresh();
  else notifyLogisticsChanged();
  toast.success(message, {
    description: docLinks(navigate, rest),
    action: openAction(navigate, main),
  });
};
