import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

/**
 * Обход меню по тому, что реально отрисовано на экране (а не по статическому
 * списку ссылок): сначала собираем ссылки rail, затем для каждого модуля
 * собираем ссылки его aside и проверяем, что каждый пункт открывается без
 * HTTP-ошибок (404/5xx), без аварий страницы и без ошибок в консоли.
 *
 * Проверки намеренно «нежёсткие»: мы не привязываемся к конкретным названиям
 * или количеству пунктов, поэтому добавление/переименование пунктов меню не
 * ломает тест — он просто обойдёт актуальный набор.
 */

const RAIL_SELECTOR = 'aside[aria-label="Main navigation"]';
const ASIDE_SELECTOR = "aside[data-module-aside]";

// Безобидный шум консоли dev-режима, который не должен валить тест.
const IGNORED_MESSAGE_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /favicon/i,
  /ResizeObserver loop/i,
  // Предупреждения React/Next в dev-режиме (Warning: ...) — это не ошибки исполнения.
  /^Warning:/i,
];

const isIgnored = (text: string): boolean =>
  IGNORED_MESSAGE_PATTERNS.some((pattern) => pattern.test(text));

type ErrorSink = {
  consoleErrors: string[];
  pageErrors: string[];
};

const attachErrorCollectors = (page: Page): ErrorSink => {
  const sink: ErrorSink = { consoleErrors: [], pageErrors: [] };

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (isIgnored(text)) return;
    sink.consoleErrors.push(text);
  });

  page.on("pageerror", (error) => {
    if (isIgnored(error.message)) return;
    sink.pageErrors.push(error.message);
  });

  return sink;
};

// Нормализуем путь: убираем хвостовой слэш (кроме корня) и якорь.
const normalizePath = (href: string): string => {
  const withoutHash = href.split("#")[0];
  if (withoutHash.length > 1 && withoutHash.endsWith("/")) {
    return withoutHash.replace(/\/+$/, "");
  }
  return withoutHash;
};

const isInternalPath = (href: string): boolean =>
  href.startsWith("/") && !href.startsWith("//");

type NavResult = { status: number; error?: string };

// Навигация с одной повторной попыткой: dev-сервер иногда прерывает запрос
// (ERR_ABORTED) при первой компиляции роута — это не настоящая ошибка страницы.
const navigate = async (page: Page, target: string): Promise<NavResult> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await page.goto(target, { waitUntil: "domcontentloaded" });
      return { status: response?.status() ?? 0 };
    } catch (error) {
      if (attempt === 1) {
        return { status: 0, error: error instanceof Error ? error.message : String(error) };
      }
      await page.waitForTimeout(500);
    }
  }
  return { status: 0, error: "unreachable" };
};

const collectInternalLinks = async (page: Page, containerSelector: string): Promise<string[]> => {
  const container = page.locator(containerSelector).first();
  if ((await container.count()) === 0) return [];

  const hrefs = await container.locator("a[href]").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") ?? ""),
  );

  const internal = hrefs.filter(isInternalPath).map(normalizePath);
  return Array.from(new Set(internal));
};

test("rail и aside: каждый пункт меню открывается без 404 и без ошибок", async ({ page }) => {
  const sink = attachErrorCollectors(page);
  const failures: string[] = [];
  const visited = new Set<string>();

  // Открываем стартовую страницу и убеждаемся, что rail отрисовался.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(RAIL_SELECTOR).first().waitFor({ state: "visible" });

  const railLinks = await collectInternalLinks(page, RAIL_SELECTOR);
  expect(railLinks.length, "Rail должен содержать навигационные ссылки").toBeGreaterThan(0);

  // BFS-обход: стартуем с пунктов rail, на каждом модуле добираем пункты aside.
  const queue: string[] = ["/", ...railLinks];

  while (queue.length > 0) {
    const target = normalizePath(queue.shift() as string);
    if (visited.has(target)) continue;
    visited.add(target);

    const consoleBefore = sink.consoleErrors.length;
    const pageBefore = sink.pageErrors.length;

    const { status, error } = await navigate(page, target);

    if (error) {
      failures.push(`${target} → ошибка навигации: ${error}`);
      continue;
    }
    if (status >= 400) {
      failures.push(`${target} → HTTP ${status}`);
      continue;
    }

    // Ждём отрисовку rail как признак успешной гидрации страницы.
    await page
      .locator(RAIL_SELECTOR)
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .catch(() => failures.push(`${target} → rail не отрисовался`));

    // Даём время асинхронным ошибкам всплыть в консоли.
    await page.waitForTimeout(250);

    const newConsoleErrors = sink.consoleErrors.slice(consoleBefore);
    const newPageErrors = sink.pageErrors.slice(pageBefore);

    if (newPageErrors.length > 0) {
      failures.push(`${target} → исключение страницы: ${newPageErrors.join(" | ")}`);
    }
    if (newConsoleErrors.length > 0) {
      failures.push(`${target} → ошибки консоли: ${newConsoleErrors.join(" | ")}`);
    }

    // Добираем пункты aside текущего модуля и кладём новые в очередь.
    const asideLinks = await collectInternalLinks(page, ASIDE_SELECTOR);
    for (const link of asideLinks) {
      if (!visited.has(link)) queue.push(link);
    }
  }

  expect(visited.size, "Должно быть обойдено больше одного маршрута").toBeGreaterThan(1);
  expect(failures, `Проблемы при обходе меню:\n${failures.join("\n")}`).toEqual([]);
});
