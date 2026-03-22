# Quickstart: 3D Container Packing Visualization

## 1. Prerequisites

- Node.js active LTS
- npm (latest stable)

## 2. Install dependencies

```bash
npm install
```

## 3. Run development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4. Expected behavior (MVP+)

- Страница показывает результат упаковки для выбранного пресета заказа (`?orderId=`).
- Расчёт упаковки выполняется асинхронно (Web Worker в браузере), интерфейс не блокируется на время расчёта.
- При **валидном** размещении (геометрия, опора, полнота) отображается 3D-сцена: контейнеры можно вращать (OrbitControls), есть инструменты зума/сброса камеры.
- При **невалидном** размещении (включая габариты товара больше контейнера) 3D-сцена **не** показывается; в области визуализации выводится предупреждение; подробности — в блоке «Аудит результата» (по умолчанию свёрнут).
- Ни один элемент валидного результата не должен выходить за границы, пересекаться или «висеть» без опоры (проверяется доменной валидацией).
- Если не все единицы размещены, в аудите видны неразмещённые и причины нарушений.

## 5. Validation checks (ручная проверка)

- Проверить `usedContainerCount` и `summary` (placed / total / unplaced).
- При проблемах с габаритами строк заказа — сообщения вида «Габариты товара превышают контейнер» в `validation.violations`.
- Проверить флаги `validation` (`geometryValid`, `supportValid`, `completenessValid`, `deterministic`).
- Для отображения 3D необходимо `isPackingPlacementValid(validation)` (все три: геометрия, опора, полнота).

## 6. Test run

```bash
npm test
```

Покрытие: см. раздел «Тесты» в корневом `README.md`.

## 7. Compliance checks

```bash
npm run check:deps
npm run check:docs
```

## 8. Latest verification snapshot

Перед коммитом рекомендуется:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

(Сценарий `npm run test:e2e` в проекте не используется — e2e не настроены.)

## 9. Documentation policy

- Для каждой внешней библиотеки фиксировать ссылку на официальную документацию (см. `src/lib/docs-links.ts` и `npm run check:docs`).
- Использовать только latest stable версии без prerelease-веток.
- Корневой `README.md` — актуальный обзор архитектуры и потока данных.
