"use client";

import { toast } from "sonner";

export type CreatedDocLink = {
  href: string;
  label: string;
};

/** Часть документов уже создана: закрыть окно, открыть первый и назвать сбой. */
export const reportPartialCreate = async (
  navigate: (href: string) => void,
  created: CreatedDocLink[],
  failed: string,
  reload?: () => Promise<void>,
) => {
  const [main, ...rest] = created;
  if (!main) return;
  await reload?.();
  const createdNames = [main, ...rest].map((item) => item.label).join(", ");
  toast.error("Создано не всё", {
    description: `Создано: ${createdNames}. Не удалось: ${failed}`,
  });
  navigate(main.href);
};

/** Открывает главный документ. Остальные — ссылками в тосте. */
export const openCreatedDocuments = (
  navigate: (href: string) => void,
  main: CreatedDocLink,
  rest: CreatedDocLink[] = [],
) => {
  if (rest.length > 0) {
    toast.success("Созданы документы", {
      description: (
        <span className="mt-1 flex flex-col items-start gap-1">
          {rest.map((item) => (
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
      ),
    });
  }
  navigate(main.href);
};
