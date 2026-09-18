---
title: 'Каталог PIM: не показывать захардкоженные товары'
type: 'bugfix'
created: '2026-09-18'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** На `/store/pim/products` сначала мелькает захардкоженный демо-каталог, затем его сменяют товары из Supabase. Пользователь видит чужой список.

**Approach:** Список на этой странице берёт только результат `loadDbCatalogItems`. Пока запрос не завершён — скелетоны. Если БД недоступна или вернула `null` — пустой список, без `STORE_CATALOG_ITEMS`. Демо-данные карточки товара не трогаем.

</frozen-after-approval>

## Implementation Notes

- Пока `dbItems === null`, в контроллер нельзя передавать `undefined`: `useCatalogController` тогда подставляет `getCatalogSourceItems` (демо).
- Тесты сейчас мокают `loadDbCatalogItems → null` и ищут «Ace 1000» / «Force 1000 EFI Touring» в демо. Их нужно перевести на фикстуры.
- Файл `store-catalog-demo-data.ts` оставляем: карточка товара и типы всё ещё зависят от него.
- Решение: `dbItems === null` держит скелетоны; `null`/ошибка с БД → `[]`. Контроллер больше не знает про demo-массив; `getCatalogSourceItems` удалён.
- Тесты: отложенный `loadDbCatalogItems` не рисует Force 1000 EFI / Series 01; фикстуры для поиска и variants.
- Браузер: `/store/pim/products` показывает `store_product` (Force 1100 EFI, 207 позиций), без demo Series. Поиск «Force 1100» даёт 5 реальных строк.
- После Blind Hunter: скелетоны/`aria-busy` в тесте, catch-путь, футер «Загрузка…» пока `dbItems === null`, `aria-busy` на таблице.

## Review Triage Log

- pending-load не проверял скелетоны — medium, правда; добавлены `aria-busy`, `[data-slot=skeleton]`, «Загрузка…» и отсутствие empty-state.
- нет теста на reject `loadDbCatalogItems` — medium, правда; добавлен тест empty-state после throw.
- docs всё ещё писали «другой источник» при смене listing — medium, правда для устаревшей фразы; исправлено. Отдельный запрос «залочить buy/from» — false: различия режимов на месте, в браузере у variants есть кнопки корзины.
- spec `in-progress` и устаревшая заметка про `getCatalogSourceItems` — false как дефект продукта; статус/заметки обновлены в финализации.
- intro docs не упоминал thrown error — low, правда; intro дополнен, таблица источников уже содержала «ошибка».
- нет `aria-busy` на таблице во время ожидания БД — medium, правда; `aria-busy`/`aria-label` на `Table`.
- футер «Показано 0 из 0» пока ждём БД — medium, правда; `isLoading` → «Загрузка…».
- docs про `router.replace` vs `history.replaceState` — low/old, не из этого изменения; не трогали.
