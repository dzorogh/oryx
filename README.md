# Container Packing Visualization

Веб-приложение на Next.js для расчета и 3D-визуализации укладки товаров в контейнеры.
Проект решает задачу упаковки фиксированных заказов с геометрическими ограничениями и показывает результат на интерактивной сцене.

## Что делает проект

- рассчитывает раскладку единиц товара по контейнерам;
- минимизирует число используемых контейнеров без потери полноты размещения (если это возможно);
- валидирует результат (геометрия, опора, полнота, детерминированность);
- отображает все контейнеры в одной 3D-сцене;

## Технологический стек

- `Next.js` (App Router), `React`, `TypeScript`;
- `three`, `@react-three/fiber`, `@react-three/drei` для 3D-визуализации;
- `zod` для runtime-валидации входа/выхода;
- `Vitest` + `Testing Library` + `Playwright` для тестирования;
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

### Производительность

- `npm run bench:packing` — бенчмарк упаковочного движка;
- `npm run analyze:cpu` — CPU profiling для скрипта бенчмарка.

## Архитектура

Проект разделен на 2 основных слоя:

1. **UI (App + features)**  
   Отвечает за интерфейс, выбор заказа, 3D-рендер и вызов расчёта на клиенте.
2. **Domain (packing/report)**  
   Содержит бизнес-логику упаковки, валидации и формирование summary (`generatePackingResult` вызывается в браузере из хука `usePackingResult`).

## Структура файлов

Ниже — ключевые директории и файлы (без служебных артефактов вроде `.next` и `node_modules`):

```text
app/
  layout.tsx                       # Корневой layout
  page.tsx                         # Главная страница, выбор заказа, сцена, панель результата

src/
  domain/
    packing/
      constants.ts                 # Габариты контейнера, пресеты заказов, default order
      types.ts                     # Доменные типы упаковки
      expand-order.ts              # Разворачивание quantity -> отдельные unit
      schema-validation.ts         # Zod-схемы входа/выхода
      placement-validation.ts      # Проверки пересечений/границ/опоры
      result-validation.ts         # Комплексная валидация результата + fingerprint
      packing-engine.ts            # Основной алгоритм упаковки
      generate-packing-result.ts   # Оркестрация расчёта + валидации + summary (вызывается на клиенте)
    report/
      summarize-result.ts          # Подсчет summary (placed/unplaced/total)
  features/
    packing-visualization/
      hooks/
        usePackingResult.ts        # Расчёт упаковки на клиенте (generatePackingResult)
      components/
        multi-container-scene.tsx  # Единая 3D-сцена для всех контейнеров
        item-mesh.tsx              # 3D-меш единицы товара
        result-panel.tsx           # Метрики, статусы валидации, статистика
  lib/
    deterministic-sort.ts          # Дет. сортировка для воспроизводимости
    docs-links.ts                  # Ссылки/утилиты для проверки документации

tests/
  unit/                            # home-page (UI), generate-packing-result (все пресеты заказов)

scripts/
  bench-packing.mjs                # Бенчмарк движка упаковки
  check-dependencies.mjs           # Проверка dependency-политик
  check-doc-links.mjs              # Проверка ссылок в документации
```

## Поток данных

1. Пользователь выбирает заказ на `app/page.tsx`.
2. Хук `usePackingResult(orderId)` на клиенте вызывает `generatePackingResult(orderId)`.
3. `generatePackingResult`:
   - берет пресет заказа из `constants.ts`;
   - валидирует вход через `zod`;
   - разворачивает позиции заказа в штучные `unit`;
   - запускает `runPackingEngine`;
   - валидирует результат;
   - добавляет summary и возвращает типизированный результат.
4. UI рендерит сцену и панель результата.

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

- поворот товара только в плоскости пола (`yaw: 0 | 90`);
- вес не участвует в оптимизационной целевой функции;
- размещения должны быть без:
  - выхода за границы контейнера;
  - пересечений;
  - "висящих" (неподдерживаемых) элементов;
- приложение ориентировано на преднастроенные пресеты заказов в `constants.ts`.

## Надежность и безопасность данных

- входные и выходные структуры проходят проверку через `zod`;
- результат дополнительно проверяется доменными валидаторами;
- в тестовом/строгом режиме включена проверка детерминированности через повторный прогон и fingerprint;
- расчёт выполняется в браузере из известных пресетов заказов; произвольный JSON с сервера не подмешивается.

## Документация и спецификации

- `specs/001-container-packing-visualization/spec.md` — исходная спецификация;
- `specs/001-container-packing-visualization/plan.md` — план реализации;
- `specs/001-container-packing-visualization/tasks.md` — декомпозиция задач;
- `specs/001-container-packing-visualization/contracts/packing-result.schema.json` — контракт ответа.

## Рекомендуемый baseline-check перед PR

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:deps
npm run check:docs
```
