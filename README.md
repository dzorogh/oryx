# Container Packing Visualization

Веб-приложение на Next.js для расчёта и 3D-визуализации укладки товаров в контейнеры.
Проект решает задачу упаковки фиксированных заказов с геометрическими ограничениями и показывает результат на интерактивной сцене.

## Что делает проект

- рассчитывает раскладку единиц товара по контейнерам (в фоне через Web Worker в браузере, без блокировки UI; в тестах и без Worker — отложенный вызов на следующий macrotask);
- минимизирует число используемых контейнеров без потери полноты размещения (если это возможно);
- валидирует результат (геометрия, опора, полнота, детерминированность) и проверяет, что габариты каждой позиции заказа **помещаются в контейнер** (с учётом поворота по yaw на полу и фиксированной высоты по вертикали);
- отображает все контейнеры в одной 3D-сцене **только если** размещение проходит проверку `isPackingPlacementValid` (геометрия + опора + полнота); иначе вместо сцены показывается сообщение об ошибках, детали — в блоке «Аудит результата» (по умолчанию свёрнут);

## Технологический стек

- `Next.js` (App Router), `React`, `TypeScript`;
- `three`, `@react-three/fiber`, `@react-three/drei` для 3D-визуализации;
- UI: [shadcn/ui](https://ui.shadcn.com/) (пресет Base UI, компоненты в `src/components/ui/`);
- `zod` для runtime-валидации входа/выхода;
- `Vitest` + `@testing-library/react` (jsdom);
- `ESLint` + `TypeScript` проверки.

## Быстрый старт

### Требования

- Node.js (актуальный LTS);
- npm.

### Установка и запуск

```bash
npm install
npm run dev
```

После запуска откройте [http://localhost:3000](http://localhost:3000).

## Скрипты проекта

### Разработка

- `npm run dev` — запуск dev-сервера Next.js;
- `npm run build` — production-сборка;
- `npm run start` — запуск production-сервера.

### Качество и проверки

- `npm run lint` — проверка ESLint;
- `npm run typecheck` — проверка TypeScript (`tsc --noEmit`);
- `npm run check:deps` — проверка зависимостей;
- `npm run check:docs` — проверка ссылок в документации.

### Тестирование

- `npm run test` — все тесты Vitest;
- `npm run test:coverage` — те же тесты с отчётом покрытия (V8);
- `npm run test:watch` — Vitest в watch-режиме;
- `npm run test:mutation` — mutation-тестирование (Stryker).

Подробнее о том, что покрыто тестами — в разделе [Тесты](#тесты) ниже.

### Производительность

- `npm run bench:packing` — бенчмарк упаковочного движка;
- `npm run analyze:cpu` — CPU profiling для скрипта бенчмарка.

## Архитектура

Проект разделен на два основных слоя:

1. **UI (App + features)**  
   Интерфейс, выбор заказа (`/pim/orders/:id`), таблица заказа, 3D-сцена, панель аудита, оболочка: рейл в корневом layout, боковая навигация в `app/pim/layout.tsx`.
2. **Domain (packing/report)**  
   Упаковка, валидация результата, проверка габаритов относительно контейнера, summary.

## Структура файлов

Ниже — ключевые директории и файлы (без служебных артефактов вроде `.next` и `node_modules`):

```text
app/
  layout.tsx                       # Корневой layout: шрифт Manrope, NavRail
  page.tsx                         # Редирект: `?orderId=` (устар.) → /pim/orders/<id>, иначе /pim/orders/<default>
  pim/
    layout.tsx                     # Фон PIM, aside + навигация по заказам (client), основная колонка
    page.tsx                       # Редирект на /pim/orders/<default>
    orders/[orderId]/page.tsx      # Заголовок заказа + OrderPackingDynamicContent, notFound, SSG params

src/
  components/
    layout/
      nav-rail.tsx                 # Левый навигационный рейл (Lucide, по макету Figma Corportal)
    pim/
      pim-aside.tsx                # Левый aside PIM
      pim-order-nav.tsx            # Ссылки на /pim/orders/:id
      pim-main-column.tsx          # Отступ под рейл + aside
      order-header.tsx             # Breadcrumb + h1
      order-packing-app-chrome.tsx # Композиция для unit-тестов (рейл + PIM + колонка)
    ui/                            # shadcn-компоненты (button, card, alert, …)

  workers/
    packing-result.worker.ts       # Web Worker: вызов generatePackingResult
  domain/
    packing/
      constants.ts                 # Габариты контейнера, пресеты заказов, default order
      types.ts                     # Доменные типы упаковки
      expand-order.ts              # Разворачивание quantity -> отдельные unit
      order-container-fit.ts       # Проверка «товар помещается в контейнер» по правилам yaw
      schema-validation.ts         # Zod-схемы входа/выхода
      placement-validation.ts      # Проверки пересечений/границ/опоры
      result-validation.ts         # Комплексная валидация + isPackingPlacementValid
      packing-engine.ts            # Основной алгоритм упаковки
      generate-packing-result.ts   # Оркестрация: движок + oversized + валидация + summary
    report/
      summarize-result.ts          # Подсчёт summary (placed/unplaced/total)
  features/
    packing-visualization/
      hooks/
        usePackingResult.ts        # Расчёт через runPackingAsync, состояние loading/error
      components/
        order-packing-page.tsx      # Клиент: OrderPackingDynamicContent
        order-view-section.tsx       # Таблица заказа, сцена или блок ошибки, ResultPanel
        multi-container-scene.tsx    # Единая 3D-сцена для всех контейнеров
        item-mesh.tsx
        result-panel.tsx             # Аудит (свёрнут по умолчанию)
  lib/
    run-packing-async.ts           # Worker или отложенный main-thread fallback
    deterministic-sort.ts
    utils.ts

tests/
  unit/
    home-page.test.tsx             # Интеграция главной страницы (mock 3D)
    order-view-section.test.tsx    # Сцена vs ошибка vs спиннер
    generate-packing-result.test.ts
    order-container-fit.test.ts
    result-validation.test.ts
    run-packing-async.test.ts

scripts/
  bench-packing.mjs
  check-dependencies.mjs
  check-doc-links.mjs

specs/001-container-packing-visualization/  # спецификация, план, quickstart
```

## Поток данных

1. Пользователь выбирает заказ в URL (`/pim/orders/<id>`) или меняет количества в таблице.
2. Хук `usePackingResult(orderId, orderItems)` вызывает `runPackingAsync` → в браузере сообщение в **Web Worker**, который выполняет `generatePackingResult(orderId, orderItems)`; без Worker (тесты) — тот же расчёт через `setTimeout(0)`.
3. `generatePackingResult`:
   - берёт состав заказа из пресета или переданного override;
   - валидирует вход через `zod`;
   - проверяет габариты строк заказа относительно контейнера (`getOversizedOrderViolations`);
   - разворачивает позиции в штучные `unit`;
   - запускает `runPackingEngine`;
   - валидирует результат и объединяет нарушения;
   - добавляет summary и возвращает типизированный результат.
4. UI: при успешной валидации размещения — 3D-сцена и метрика «Отрисовка»; при ошибках — предупреждение вместо сцены; панель аудита доступна с полным списком нарушений.

## Алгоритм упаковки (кратко)

`src/domain/packing/packing-engine.ts` реализует эвристический детерминированный packer:

- сортирует unit по площади основания/высоте для стабильного порядка;
- пробует базовый greedy-проход (`packWithLimit`);
- затем пытается уменьшить число контейнеров (`pickBestResultByLimit`);
- использует межконтейнерный режим (`packAcrossContainers`) с score-вектором;
- поддерживает поворот только по `yaw` (`0 | 90`);
- учитывает:
  - габариты контейнера;
  - отсутствие пересечений;
  - необходимость опоры;
  - детерминированный порядок действий/сортировок.

## Ограничения и допущения

- поворот товара только в плоскости пола (`yaw: 0 | 90`), высота груза по вертикали совпадает с полем `height` позиции;
- вес не участвует в оптимизационной целевой функции;
- размещения должны быть без:
  - выхода за границы контейнера;
  - пересечений;
  - «висящих» (неподдерживаемых) элементов;
- приложение ориентировано на преднастроенные пресеты заказов в `constants.ts` и редактирование количеств в UI.

## Надёжность и безопасность данных

- входные и выходные структуры проходят проверку через `zod`;
- результат дополнительно проверяется доменными валидаторами;
- расчёт выполняется в браузере из известного состава заказа; произвольный JSON с сервера не подмешивается.

## Тесты

Автотесты лежат в `tests/unit/`:

| Файл | Назначение |
|------|------------|
| `home-page.test.tsx` | Главная страница: заказы, аудит, сцена vs блок ошибки для невалидных пресетов |
| `order-view-section.test.tsx` | Спиннер, 3D-заглушка при успехе, блок «Ошибки размещения» при невалидном результате |
| `generate-packing-result.test.ts` | Все пресеты заказов, override, габариты больше контейнера |
| `order-container-fit.test.ts` | `itemTypeFitsInContainer`, `getOversizedOrderViolations` |
| `result-validation.test.ts` | `isPackingPlacementValid` |
| `run-packing-async.test.ts` | Эквивалентность результату `generatePackingResult` (без сравнения `packingMs`) |

Рекомендуемый прогон перед PR:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Документация и спецификации

- `specs/001-container-packing-visualization/spec.md` — исходная спецификация;
- `specs/001-container-packing-visualization/plan.md` — план реализации;
- `specs/001-container-packing-visualization/tasks.md` — декомпозиция задач;
- `specs/001-container-packing-visualization/quickstart.md` — быстрый старт и проверки;
- `specs/001-container-packing-visualization/contracts/packing-result.schema.json` — контракт ответа (если используется).

## Рекомендуемый baseline-check перед PR

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:deps
npm run check:docs
```
