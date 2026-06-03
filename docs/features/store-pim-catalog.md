# Store PIM — каталог товаров

Единая страница **Products** (`/store/pim/products`): просмотр **базовых товаров** и **вариантов** в таблице, фильтрация, настройка колонок, пагинация. Сейчас **demo-данные** в браузере (без API).

Переключатель **Base products** / **Product variants** в toolbar (чипы, как вкладки в Pulse Thanks). Отдельного пункта subnav и маршрута каталога вариантов больше нет.

## Маршруты и навигация

| URL | Поведение |
|-----|-----------|
| `/store/pim/products` | Каталог; режим по умолчанию — base products |
| `/store/pim/products?listing=variants` | Тот же каталог в режиме product variants |

- Страница: `app/store/pim/products/page.tsx` → `StoreCatalogPage`
- Subnav Store: только **Products** в каталожной группе (`src/features/store/store-nav.ts`)
- Карточка товара: `/store/pim/products/[productId]`

## Переключатель listing mode

В `catalog-toolbar.tsx` — `role="tablist"`, чипы `HomeFilterChip`:

| Режим | `listingMode` | Подпись UI |
|-------|---------------|------------|
| Базовые товары | `products` | Base products |
| Варианты | `variants` | Product variants |

**Источник правды для режима — URL** (`?listing=variants` или без query). `localStorage` (`store-catalog-listing-mode`) используется только при первом заходе без query: если сохранён `variants`, выполняется `router.replace` с query.

При смене режима:

1. Меняется `aria-label` у **Add** (подзаголовок страницы общий)
2. Подключается свой ключ `localStorage` для колонок (см. ниже)
3. Сбрасывается страница пагинации на 1, закрывается панель Columns
4. `router.replace` обновляет URL и пишет режим в `store-catalog-listing-mode`

Фильтры и поиск **общие** при переключении (не сбрасываются). Список **перезагружается**: другой источник данных + скелетон ~200 ms (как при смене фильтра).

### Источники данных (demo)

| Режим | Массив | Содержимое |
|-------|--------|------------|
| Base products | `STORE_CATALOG_ITEMS` | Базовые товары (~70 строк) |
| Product variants | `getVariantCatalogItems()` | Все варианты всех товаров (flatten из `buildVariants`) |

Ссылки с варианта ведут на карточку **родительского** товара (`getCatalogItemDetailHref`).

## Что видит пользователь

### Шапка (toolbar)

Паттерн [list-page-toolbar.md](../conventions/ui/list-page-toolbar.md). Заголовок всегда **Products**.

- Чипы listing mode → строка фильтров (поиск, категория, статусы, Filters, Columns)
- Список всегда в виде таблицы. При наведении на миниатюру товара слева всплывает увеличенное изображение (tooltip через `@base-ui/react/tooltip`, `side="left"`).

### Различия products vs variants

| Аспект | Base products | Product variants |
|--------|---------------|------------------|
| Префикс цены | `from 11,990 USD` | `11,990 USD` |
| Таблица: dealer | Цена + статус | + icon buy |

### Пагинация и состояния

- 48 записей на страницу (`PAGE_SIZE`)
- Имитация загрузки ~200 ms при смене фильтров/страницы (`use-catalog-controller`)
- Пустой список: «No products match the selected filters.»

## Поток данных

```mermaid
flowchart TD
  mode[listingMode]
  seed[getCatalogSourceItems mode]
  filter[useCatalogController filters]
  page[slice PAGE_SIZE]
  ui[CatalogTable]

  seed --> filter
  mode --> ui
  filter --> page
  page --> ui
```

## localStorage (по режимам)

| Назначение | products | variants |
|------------|----------|----------|
| Колонки | `store-catalog-visible-columns` | `store-variants-catalog-visible-columns` |
| Listing mode (страница) | `store-catalog-listing-mode` | то же |

При смене `listingMode` контроллер получает новый `columnsStorageKey`; колонки подгружаются заново (`columnsHydratedKey` предотвращает запись «чужих» колонок в новый ключ).

## Модель данных

См. прежний раздел `StoreCatalogItem` в этом файле — тип не менялся. Варианты и товары в demo используют один массив `STORE_CATALOG_ITEMS`.

**Покупка:** `getPurchaseBlockReason` + `CatalogBuyTooltip` (режим variants).

## Структура файлов

```text
app/store/pim/products/page.tsx

src/components/store/pim/products/
  store-catalog-page.tsx                  # listingMode state, URL, toolbar props
  store-catalog-demo-data.ts

  catalog/
    catalog-helpers.ts                    # listing labels, storage keys, parseListingMode
    catalog-toolbar.tsx                   # listing chips + filters
    use-catalog-controller.ts
    catalog-table.tsx
    ...
```

## Технические нюансы

- **`StoreCatalogPage`** больше не принимает `config` prop — один маршрут, режим из `useSearchParams`.
- **Миниатюра товара** в колонке Name — `Link` на товар + tooltip с увеличенным изображением слева.
- **Add** в toolbar без handler (заглушка).
- **English UI** для подписей чипов (`CATALOG_LISTING_MODE_LABELS`); русские строки в UI нарушат `check:ui-english`.

## Подключение к бэкенду (план)

1. `listingMode` → query или отдельный endpoint (`/catalog/products` vs `/catalog/variants`).
2. Сохранить раздельные prefs колонок per mode.
3. Опционально: не дублировать фильтры между режимами на сервере.

## Локальная проверка

```bash
npm run dev
# http://localhost:3000/store/pim/products
# http://localhost:3000/store/pim/products?listing=variants

npm run test -- tests/unit/store-catalog-page.test.tsx
npm run check:ui-english
```

## Связанные материалы

- [AGENTS.md](../../AGENTS.md)
- [pulse-thanks.md](pulse-thanks.md) — паттерн чипов в toolbar
