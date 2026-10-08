# Слои модуля «Магазин»

Код магазина лежит в двух папках. Зависимости идут в одну сторону; ESLint (`no-restricted-imports` в `eslint.config.mjs`) ломает сборку lint при нарушении.

```text
components/store/**  (PIM UI: каталог, карточка demo, прайс-листы)
        │
        ▼
features/store/**    (страницы магазина, корзина, оформление, загрузчики из БД, общие виджеты)
        │                         ▲
        ▼                         │ только базовый слой
features/logistics/** ────────────┘
```

| Откуда | Можно импортировать | Нельзя |
|---|---|---|
| `src/components/store/**` | `features/store/**`, `features/logistics/**` | — |
| `src/features/store/**` | `features/store/**`, `features/logistics/**` | `@/components/store/*` |
| Базовый слой store (ниже) | `features/store/domain/*`, общие `@/lib`, `@/components/ui` | `@/components/store/*`, `@/features/logistics/*` |
| `src/features/logistics/**`, `app/store/logistics/**` | только базовый слой store | остальной `features/store/*`, `@/components/store/*` |
| `src/features/store/domain/**` | только `features/store/domain/*` | всё остальное из `features/*` и `components/store/*` |

**Базовый слой store** — то, что делят магазин и логистика:

- `features/store/domain/` — чистые типы и проверки: `currency.ts` (`CurrencyCode`, `isCurrencyCode`), `statuses.ts` (дилерский и розничный статусы, подписи), `catalog-item.ts` (`StoreCatalogItem`, цены и статусы по регионам, `CATALOG_PAGE_SIZE`, `CATALOG_NO_SITE_KEY`).
- `features/store/region-context.tsx`, `region-selection.ts`, `region-switcher.tsx` — выбранный регион.
- `features/store/product-photo.tsx`, `features/store/packing/**`.

## Правила

- Доменные типы не живут в `*-demo-data.ts` и в хелперах UI. Код, работающий с БД, не должен зависеть от демо-модулей.
- Если странице из `features/store` нужен виджет из `components/store` — переносите виджет в `features/store` (так перенесены `region-switcher`, `variant-stock-summary`, `catalog-buy-tooltip`), а не импортируйте его обратно.
- Загрузчик, который обслуживает только PIM UI, живёт рядом с этим UI (`components/store/pim/pricelists/pricelists-from-db.ts`).
- Новый модуль, нужный логистике, сначала проверьте: не тянет ли он `features/logistics`. Если нет — добавьте его в базовый слой в `eslint.config.mjs` и в этот список.
