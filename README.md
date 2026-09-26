# Oryx BMS

**Oryx BMS** (Business Management System) — веб-приложение на Next.js для внутренних бизнес-процессов: главная рабочая панель, контентные разделы и PIM-модуль с 3D-визуализацией упаковки заказов.

## Что есть в проекте сейчас

- **Главная панель (`/`)**: набор бизнес-блоков (статистика, рейтинг, новости, благодарности, дни рождения, задачи, идеи) с сохранением пользовательского layout в `localStorage`.
- **Pulse (`/pulse/*`)**: новости, идеи, благодарности, опросы, согласования счетов и платежей, кабинет компании.
- **Store (`/store/*`)**: каталог товаров PIM, заказы с 3D-визуализацией упаковки и модуль Logistics — заказы клиента и на производство, выпуски и календарь выпусков, резервы, отгрузки, перемещения, корректировки, остатки, журнал, справочники ([docs/features/logistics.md](docs/features/logistics.md)).
- **Team, Tracker, профиль пользователя**: `/team/*`, `/tracker/*`, `/users/[userId]`.
- **Разделы-заготовки**: CRM, Analytics, Learning, Library, Settings — страницы-заглушки; `/[section]` — заглушки `activity`, `catalog`, `help`, `search`, `services`.

## Технологический стек

- `Next.js` (App Router), `React`, `TypeScript`
- UI-компоненты: `@base-ui/react`, `shadcn/ui`-подход, `lucide-react`
- Стили: `Tailwind CSS v4`
- 3D: `three`, `@react-three/fiber`, `@react-three/drei`
- Валидация данных: `zod`
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
- `/pulse/news`, `/pulse/ideas`, `/pulse/thanks`, `/pulse/polls`, `/pulse/company`, `/pulse/approvals/*` — Pulse
- `/store` — редирект на `/store/pim/products` (каталог товаров)
- `/store/orders`, `/store/orders/[orderId]` — заказы и страница упаковки
- `/store/logistics/*` — Logistics (корень ведёт на `/store/logistics/stock`); `/store/settings` — префиксы кодов
- `/team/*`, `/tracker/*`, `/users/[userId]` — сотрудники, задачи и проекты, профиль
- `/crm/*`, `/analytics/*`, `/learning/*`, `/library/*`, `/settings/*` — заглушки будущих разделов
- `/pim`, `/pim/orders/[orderId]`, `/logistics/*` — старые адреса, редиректят в `/store`
- `/[section]` — placeholder-страницы (`activity`, `catalog`, `help`, `search`, `services`)

## Conventions (agents and contributors)

Tool-neutral guidelines for UI and layout live in **[docs/conventions/](docs/conventions/)**. Start from **[AGENTS.md](AGENTS.md)** for AI assistants (Cursor, Codex, Claude, etc.).

Описание разделов приложения (как работают экраны): **[docs/features/](docs/features/)** — например [Pulse Thanks](docs/features/pulse-thanks.md).

## Архитектура (кратко)

Проект разделен на UI-слой и доменный слой.

1. **UI (App + components + features)**  
   Роутинг, layout, навигационный рейл, контентные страницы, Store/Logistics-экраны и 3D-визуализация.
2. **Domain (packing + report)**  
   Расчет упаковки, проверка ограничений размещения, валидация результата и сводка по размещению.

## Структура проекта

```text
app/
  layout.tsx                      # Корневой layout и NavRail
  page.tsx                        # Главная панель BMS
  pulse/                          # Новости, идеи, благодарности, опросы, согласования
  store/                          # Каталог PIM, заказы с упаковкой, logistics/, settings
  team/, tracker/, users/         # Сотрудники, трекер задач, профиль
  crm/, analytics/, learning/,
  library/, settings/             # Заглушки будущих разделов
  pim/, logistics/                # Редиректы со старых адресов в /store
  api/comments/                   # API модуля комментариев (AI, unfurl)
  [section]/page.tsx              # Placeholder-страницы

src/
  components/
    layout/                       # NavRail, поиск, shell-компоненты модулей
    home/                         # Блоки главной страницы
    store/                        # Каталог PIM, заказы, шапка страницы упаковки
    ui/                           # Базовые UI-компоненты
  features/
    logistics/                    # Logistics: страницы, диалоги, API, правила
    comments/                     # Переиспользуемый модуль комментариев
    pulse/, users/, store/, ...   # Остальные модули
    packing-visualization/        # UI/хуки 3D-визуализации упаковки
  domain/
    packing/                      # Алгоритм упаковки и проверки
    report/                       # Summary-логика
  workers/
    packing-result.worker.ts      # Вычисление упаковки в Web Worker
  lib/                            # Утилиты, клиент Supabase

supabase/migrations/              # Схема демо-бэкенда (store_*, thank_you_entry)

scripts/
  check-*.mjs                     # Проверки (зависимости, ссылки, изображения)
  seed-*.mjs                      # Наполнение демо-бэкенда (service_role)

tests/unit/                       # Unit-тесты доменной логики (node:test)
```

## PIM / Packing подсистема

PIM-модуль использует доменную логику из `src/domain/packing` и визуальный слой из `src/features/packing-visualization`.

Базовый поток:

1. Пользователь открывает заказ (`/store/orders/[orderId]`).
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
- `npm run build` — production-сборка
- `npm run check:deps` — проверка зависимостей
- `npm run check:docs` — проверка ссылок в документации
- `npm run check:static-images` — проверка правил для статических изображений
- `npm test` — unit-тесты доменной логики (`tests/unit/`, `node:test`)
- Пользовательский текст на страницах — на русском ([russian-labels.md](docs/conventions/ui/russian-labels.md)). Старые `check:ui-english` / `lint:ui-english` не являются обязательной проверкой.

Приложение — быстро меняющийся исследовательский прототип: CI и e2e-тестов нет. Есть unit-тесты чистой доменной логики (в основном Logistics) — `npm test`. Изменения интерфейса дополнительно проверяются вручную в браузере на затронутых экранах.

## Рекомендуемый baseline-check перед PR

```bash
npm run lint
npm run typecheck
npm run build
npm run check:deps
npm run check:docs
npm run check:static-images
npm test
```

Для изменений интерфейса после этих команд вручную проверьте затронутые экраны в браузере.

## Текущий статус и ограничения

- Часть разделов пока реализована как placeholder-страницы (CRM, Analytics, Learning, Library, Settings и `app/[section]/page.tsx`).
- Контент на главной странице и на отдельных экранах в основном demo-данные. Pulse Thanks и Store/Logistics при заданных `NEXT_PUBLIC_SUPABASE_*` ходят в **свой** self-hosted Supabase (Dokploy compose `supabase`). Как работать: [docs/conventions/backend/supabase.md](docs/conventions/backend/supabase.md).
- PIM-модуль работает на преднастроенных пресетах заказов из `src/domain/packing/constants.ts`.

## Документация по спецификации упаковки

- `specs/001-container-packing-visualization/spec.md`
- `specs/001-container-packing-visualization/plan.md`
- `specs/001-container-packing-visualization/tasks.md`
- `specs/001-container-packing-visualization/quickstart.md`
