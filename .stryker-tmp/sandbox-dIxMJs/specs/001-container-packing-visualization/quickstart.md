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

## 4. Expected MVP behavior
- Страница показывает результат упаковки для фиксированного заказа.
- UI показывает список контейнеров в порядке заполнения.
- Каждый контейнер можно вращать мышью/тачпадом.
- Ни один элемент не выходит за границы, не пересекается и не "висит".
- Все единицы товара отображаются; если не все размещены, видна явная ошибка и список
  неразмещенных единиц.

## 5. Validation checks
- Проверить `usedContainerCount` и наличие всех `OrderItemUnit`.
- Проверить, что `unplacedItemUnitIds` пуст при успешном сценарии.
- Проверить флаги `validation` в результате (`geometryValid`, `supportValid`,
  `completenessValid`, `deterministic`).

## 6. Test run

```bash
npm test
```

```bash
npm run test:e2e
```

## 7. Compliance checks

```bash
npm run check:deps
npm run check:docs
```

## 8. Latest verification snapshot

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm run test` — PASS
- `npm run test:e2e` — PASS
- `npm run build` — PASS

## 9. Documentation policy
- Для каждой внешней библиотеки фиксировать ссылку на официальную документацию.
- Использовать только latest stable версии без prerelease-веток.
