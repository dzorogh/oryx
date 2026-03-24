# Oryx BMS

**Oryx BMS** (Business Management System) — веб-приложение на Next.js для внутренних бизнес-процессов: главная рабочая панель, контентные разделы и PIM-модуль с 3D-визуализацией упаковки заказов.

## Что есть в проекте сейчас

- **Главная панель (`/`)**: набор бизнес-блоков (статистика, рейтинг, новости, благодарности, дни рождения, задачи, идеи) с сохранением пользовательского layout в `localStorage`.
- **Контентные страницы**: `/news`, `/tasks`, `/ideas`, `/thanks`.
- **PIM-модуль**: `/pim/orders/[orderId]` с таблицей позиций заказа, 3D-сценой контейнеров, аудитом результата упаковки и валидацией.
- **Секции-заглушки**: `/[section]` для внутренних разделов (`activity`, `approvals`, `catalog`, `help`, `learning`, `profile`, `search`, `services`, `team`).

## Технологический стек

- `Next.js` (App Router), `React`, `TypeScript`
- UI-компоненты: `@base-ui/react`, `shadcn/ui`-подход, `lucide-react`
- Стили: `Tailwind CSS v4`
- 3D: `three`, `@react-three/fiber`, `@react-three/drei`
- Валидация данных: `zod`
- Тесты: `Vitest`, `@testing-library/react`, `jsdom`
- Качество кода: `ESLint`, `TypeScript` (`tsc --noEmit`)

## Быстрый старт

### Требования

- Node.js (актуальный LTS)
- npm

### Установка и запуск

```bash
npm install
npm run dev
```

После запуска откройте [http://localhost:3000](http://localhost:3000).

## Основные маршруты

- `/` — главная панель Oryx BMS
- `/news` — все новости
- `/tasks` — все задачи
- `/ideas` — идеи и предложения
- `/thanks` — мои благодарности
- `/pim` — редирект на дефолтный заказ
- `/pim/orders/[orderId]` — страница заказа и упаковки
- `/[section]` — служебные/будущие разделы (placeholder-страницы)

## Архитектура (кратко)

Проект разделен на UI-слой и доменный слой.

1. **UI (App + components + features)**  
   Роутинг, layout, навигационный рейл, контентные страницы, PIM-экраны и 3D-визуализация.
2. **Domain (packing + report)**  
   Расчет упаковки, проверка ограничений размещения, валидация результата и сводка по размещению.

## Структура проекта

```text
app/
  layout.tsx                      # Корневой layout и NavRail
  page.tsx                        # Главная панель BMS
  news/page.tsx                   # Список новостей
  tasks/page.tsx                  # Список задач
  ideas/page.tsx                  # Идеи и предложения
  thanks/page.tsx                 # Мои благодарности
  [section]/page.tsx              # Заглушки для внутренних разделов
  pim/
    layout.tsx                    # Layout PIM-модуля
    page.tsx                      # Редирект на /pim/orders/<default>
    orders/[orderId]/page.tsx     # Детальная страница заказа

src/
  components/
    layout/                       # NavRail, поиск, shell-компоненты
    home/                         # Блоки главной страницы
    pim/                          # Компоненты PIM-экрана
    ui/                           # Базовые UI-компоненты
  features/
    packing-visualization/        # UI/хуки 3D-визуализации упаковки
  domain/
    packing/                      # Алгоритм упаковки и проверки
    report/                       # Summary-логика
  workers/
    packing-result.worker.ts      # Вычисление упаковки в Web Worker
  lib/                            # Вспомогательные утилиты

tests/
  unit/                           # Unit/integration тесты

scripts/
  bench-packing.mjs
  check-dependencies.mjs
  check-doc-links.mjs
```

## PIM / Packing подсистема

PIM-модуль использует доменную логику из `src/domain/packing` и визуальный слой из `src/features/packing-visualization`.

Базовый поток:

1. Пользователь открывает заказ (`/pim/orders/[orderId]`).
2. `usePackingResult` запускает расчет через `runPackingAsync`.
3. В браузере расчет выполняется в `Web Worker` (`packing-result.worker.ts`), где вызывается `generatePackingResult`.
4. Результат проходит валидацию; при валидном размещении рендерится 3D-сцена, при невалидном — показываются ошибки аудита.

## Скрипты

### Разработка

- `npm run dev` — dev-сервер Next.js
- `npm run build` — production-сборка
- `npm run start` — запуск production-сборки

### Качество

- `npm run lint` — ESLint
- `npm run typecheck` — проверка типов TypeScript
- `npm run check:deps` — проверка зависимостей
- `npm run check:docs` — проверка ссылок в документации

### Тестирование

- `npm run test` — запуск тестов
- `npm run test:coverage` — тесты с покрытием
- `npm run test:watch` — watch-режим
- `npm run test:mutation` — mutation-тестирование (Stryker)

### Производительность

- `npm run bench:packing` — бенчмарк упаковочного движка
- `npm run analyze:cpu` — CPU-профилирование бенчмарка

## Рекомендуемый baseline-check перед PR

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:deps
npm run check:docs
```

## Текущий статус и ограничения

- Часть разделов пока реализована как placeholder-страницы (`app/[section]/page.tsx`).
- Контент на главной странице и на отдельных экранах сейчас построен на демо-данных из `src/components/home/*-demo-data.ts`.
- PIM-модуль работает на преднастроенных пресетах заказов из `src/domain/packing/constants.ts`.

## Документация по спецификации упаковки

- `specs/001-container-packing-visualization/spec.md`
- `specs/001-container-packing-visualization/plan.md`
- `specs/001-container-packing-visualization/tasks.md`
- `specs/001-container-packing-visualization/quickstart.md`
