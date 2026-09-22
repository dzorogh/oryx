---
title: 'Универсальные товарные строки документов'
type: 'feature'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
baseline_commit: '5465044ba75f3766cea6a0e109e868491ff9a776'
review_loop_iteration: 0
context:
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Товарные строки разъехались по семи таблицам `store_*_line` и двум allocation. В строке нет исторического снимка товара, цен и статусов, поэтому старый документ читает живой справочник. Заказ на производство материализует план в WIP через `activated_quantity` и `store_sync_production_activation`.

**Approach:** Один узкий реестр `store_document` и одна универсальная строка: количество, переход владельца, навигационные ссылки и неизменяемый снимок товара. Региональные цены и статусы — отдельные immutable строки на каждый регион. Типизированные заголовки остаются 1:1. Плановый заказ на производство не создаёт складской остаток; выпуск кладёт товар сразу на склад завода.

## Boundaries & Constraints

**Always:**

- Количество только в универсальной строке и строго `quantity > 0`. Строка сама является owner-сегментом: один SKU повторяется только при разной нормализованной паре `from_owner` / `to_owner`.
- Снимок (название, SKU, единица, вариант, производитель, регион, цены, валюты, статусы) пишет сервер в момент добавления строки и больше не меняет. Смена `quantity` или состава плана снимок не обновляет.
- `product_id`, `region_id`, `manufacturer_id` — nullable FK `ON DELETE SET NULL`. Удаление справочника не удаляет и не перерисовывает исторический документ.
- Отсутствующая региональная цена — `NULL` и не блокирует создание документа.
- Создание документа — одна транзакция: реестр, типизированный заголовок, строки, региональные снимки.
- Бизнес-номер неизменяем: `UNIQUE(series, sequence_number)`, отдельно от `store_document.id`.
- История действий — существующий `store_document_history`. Отдельных document revisions нет.
- Проведённый операционный документ и его строки frozen. Прогресс-поля в строку не входят.
- Связь документов — только на заголовке. `source_document_product_line_id` нет.
- Валидация, зависящая от вида документа, живёт в одном месте по `kind`.
- Заказ на производство не место остатка. «Свободно» = план − назначено − выпущено, «В резерве» = нескладское назначение заказу клиента. «Зарезервировать» не пишет `store_stock_transaction`. Закрытие снимает невыполненную потребность и ничего не списывает. Уже существующие факты и резервы на месте `production_order` становятся такими назначениями: документы резерва сохраняются, их складские проводки на этом месте удаляются.
- Заморозка строк как сейчас по ролям. Заказ клиента и заказ на производство: состав и `quantity` до `closed` / `cancelled`, у производства также в `done`. Резерв frozen при `posted`. Перемещение — при отправке. Выпуск — при `done`; план выпуска до этого меняется. Отгрузка и корректировка frozen сразу при создании.

**Never:**

- JSONB-снимок, отдельные segment/allocation-таблицы, line-level provenance.
- Место «Производство» / WIP и курсор `activated_quantity`.
- Клиентский Yjs и демо-прайс как источник снимка.
- Редизайн уже принятых экранов: карточка заказа на производство, колонка товаров в списках, Allocation Atlas, манифест перемещения, список резервов. Меняется источник цифр и подписей, не каркас экрана.
- Перенос редактора прайс-листов PIM с Yjs на новую таблицу цен.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Создание со дыркой в ценах | Товар без закупочной цены в одном регионе | Документ, строка и снимок региона созданы; цена `NULL` | Не откатывать транзакцию |
| Правка плана | У плановой строки меняют `quantity` | Снимок названия, цен и статусов прежний | Отказ, если документ уже закрыт или проведён |
| Удаление товара | `store_product` удалён после проведения | Документ показывает снимок; `product_id` стал `NULL` | Удаление справочника не блокируется строкой |
| Повтор SKU | Две строки одного товара с разными owner-парами | Обе сохранены | Та же пара владельцев в том же документе — отказ уникальности |
| Неположительное количество | `quantity <= 0` | Строка не записана | Ошибка ограничения |
| Заказ на производство | Создание или смена плана | В журнале нет факта на месте `production_order`. План нельзя опустить ниже назначенного плюс выпущеного | Отказ, если новый план меньше этой суммы |
| Назначение потребности | «Зарезервировать» на карточке PO | Резерв проведён, журнал не двигается, «Свободно» уменьшается на это количество | Отказ, если количество больше свободной потребности |
| Закрытие PO | Статус становится `closed` | Невыполненные назначения сняты, складской остаток не списан | — |
| Выпуск | Проведение выпуска | Фактический остаток на складе завода-изготовителя | Нет промежуточного места «Производство» |
| Заморозка | Правка строки по роли документа | Плановые строки меняются до закрытия; проведённые операционные — нет | Отказ базы на frozen-строке |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260916200000_logistics.sql` и последующие `store_*` — живые заголовки и `store_*_line`. Переиспользовать не таблицы строк, а CHECKи `quantity > 0`, `store_assert_owner`, `store_write_tx` / `store_move`, `store_record_document_history`.
- `supabase/migrations/20260921120000_store_stock_transaction_facts.sql` — `store_sync_production_activation` (~1208), закрытие PO со списанием WIP (~847). Удалить активацию; закрытие больше не пишет WIP.
- `supabase/migrations/20260921160000_store_unified_shipment.sql` — `store_return*` уже удалены; отгрузка и возврат = `store_shipment`. Не возвращать отдельные return-таблицы.
- `supabase/migrations/20260921210000_store_create_production_output.sql` — выпуск ещё ссылается на `production_order_line_id` и может писать `store_output_allocation`. Заменить на универсальные строки; allocation удалить.
- `src/features/logistics/logistics-types.ts` — семь line-типов и два allocation. Свести чтение к одной строке со снимком и owner-парой; заголовки оставить.
- `src/features/logistics/logistics-api.ts` — `loadLogisticsSnapshot` и RPC-обёртки. Единственная точка загрузки строк.
- `src/features/logistics/logistics-codes.ts`, `public.store_code` — сегодня код = `PREFIX-id` и пересчитывается из настроек. Для документов код становится неизменяемым `series-sequence`.
- `src/features/logistics/logistics-availability.ts`, `allocation-atlas.ts` — «в производстве» и разрез PO сейчас читают баланс `location_type=production_order`. Читать назначение потребности, не журнал. Каркас `ui/production-order-product-manifest.tsx` не менять; текст закрытия больше не обещает списание остатка.
- `src/features/logistics/ui/production-order-product-manifest.tsx`, `ui/customer-order-lines-table.tsx`, `ui/document-product-lines.tsx`, `ui/transfer-product-manifest.tsx`, `ui/reservation-hold-list.tsx` — каркас не менять; подписи товара брать из снимка строки.
- `src/components/store/pim/pricelists/` — Yjs-прайс не источник снимка. Не переписывать.
- `docs/features/logistics.md` — канон поведения склада. Обновить под новую модель.
- `scripts/lib/seed-logistics-stories.mjs` — сид пишет старые line-таблицы и активацию. Перевести на новые RPC.

## Tasks & Acceptance

**Execution:**

- [x] `supabase/migrations/` — новая миграция: `store_document`; 1:1 заголовки с общим PK; `store_product_region_offer`; `store_document_product_line`; `store_document_product_line_region_snapshot`; перенос строк и owner-разбиений; номера `series + sequence` = прежний отображаемый код; удаление line/allocation-таблиц, `activated_quantity`, `store_sync_production_activation`. Заголовки, журнал фактов и `store_document_history` не схлопывать.
- [x] `supabase/migrations/` — переписать create/update/post/close RPC одной транзакцией на универсальные строки. Сервер копирует снимок из `store_product` и offer. Триггер запрещает правку snapshot-полей и замораживает строки по ролям из Intent. Выпуск проводит остаток на склад завода. Резерв на месте производства не пишет журнал. Закрытие PO снимает невыполненную потребность без списания.
- [x] `src/features/logistics/logistics-types.ts`, `logistics-api.ts`, `logistics-codes.ts` — одна форма строки, загрузка снимка, код документа из `series` и `sequence_number`.
- [x] `src/features/logistics/` — писатели и проекции читают универсальную строку. Карточка PO: план / свободно / в резерве / выпущено, где свободно = план − назначено − выпущено. Колонка «В производстве» атласа = назначение этому заказу клиента.
- [x] `src/features/logistics/ui/product-identity.tsx` и списки документов — имя, SKU, единица и производитель строки из снимка, не из живого `store_product`.
- [x] `scripts/lib/seed-logistics-stories.mjs`, `docs/features/logistics.md` — сид и канон совпадают со схемой.

**Acceptance Criteria:**

- Given регион без цены товара, when создают документ с этим товаром, then документ есть, а в региональном снимке цена `NULL`.
- Given проведённая отгрузка, when меняют количество строки, then база отклоняет правку.
- Given два региона, when добавляют строку, then у строки две immutable региональные записи, даже если цены пустые.
- Given заказ на производство со свободной потребностью, when резервируют часть заказу клиента, then журнал склада не меняется, «В резерве» растёт, «Свободно» падает на ту же величину.
- Given этот заказ закрывают, when на нём осталась невыполненная потребность, then назначение снято, а складской остаток не списан.
- Given заказ на производство, when увеличивают план, then складской журнал не получает факт на месте производства, а снимок товара остаётся прежним.
- Given выпуск проведён, when смотрят остаток, then количество лежит на складе завода.
- Given товар переименован или удалён, when открывают старый документ, then видны название и SKU из снимка.

## Implementation Notes

- Ссылки списков и связанных документов ведут на `sequence_number`, карточки находят документ и по номеру, и по внутреннему id.
- Триггер строки разрешает обнуление навигационных `product_id` / `manufacturer_id` / `region_id` при удалении справочника и не замораживает заказ на производство в статусе `done`. Вставка в проведённый операционный документ тоже отклоняется.


## Spec Change Log

## Review Triage Log

- detail lines filtered by route param — high — карточки отгрузки, выпуска и корректировки искали строки по номеру из URL. Исправлено: фильтр по `doc.id`.
- snapshot load throws without product_id — high — после удаления товара снимок не открывался. Исправлено: строка остаётся, имя из снимка.
- shipment/adjustment insert blocked — high — триггер запрещал и первичную вставку. Исправлено: вставка до записи history, дальше отказ.
- atlas «Выпущено» and journey «занято» still read WIP/reserved output — high — занято читает потребность RSV; выпущено учитывает `to_owner` строки выпуска. Назначение на строку выпуска — в миграции `20260922165000`.
- public hrefs without snapshot — medium — карточка товара и журнал получали внутренний id. Исправлено передачей снимка.
- shared docsById — medium — карта документов локальна для загрузки.
- close success copy in future tense — low — текст после закрытия в прошедшем времени.
- manifest aria used live catalog name — low — подпись берётся из снимка строки.
- null explanation stringified — low — пустое объяснение остаётся пустой строкой.
- docs freeze-at-done, prefix table, ledger prose, migration stubs, close redefined, CO cancelled, href fallthrough, region prices not on screen, English RPC leftovers, seed output id, NaN ids, sequence lock, PO done claim, missing DB harness — false or defer — спека оставляет `done` редактируемым; заказ клиента не имеет `cancelled`; цены регионов хранятся и не выводятся отдельным экраном; промежуточные определения функций в миграции перекрываются финальными; гонка номеров и NaN не подтверждены на демо-пути. Проверка списания при закрытии PO остаётся без SQL-теста в `npm test`.


## Design Notes

Имена, которые пользователь в интерфейсе не видит: реестр `store_document` (`id`, `kind`, `series`, `sequence_number`, `created_at`, `created_by`); строка `store_document_product_line`; региональный снимок `store_document_product_line_region_snapshot`; канон цен — одна таблица `store_product_region_offer` (не вторая price-таблица): `product_id`, `region_id`, `purchase_price`, `dealer_price`, `retail_price` и валюта каждой, `dealer_status` (`available` \| `unavailable`), `retail_status` как в прайс-листе PIM. Наполнение offer при миграции: дилерская и розничная цена с `store_product` во все существующие регионы, закупка `NULL`. Каталожные колонки `store_product` не удалять.

Владелец — четыре колонки, как в текущем `store_assert_owner`: `from_owner_type`, `from_owner_id`, `to_owner_type`, `to_owner_id`. Free = оба NULL. Уникальность: `(document_id, product_id, coalesce(from_owner_type,''), coalesce(from_owner_id,0), coalesce(to_owner_type,''), coalesce(to_owner_id,0))`.

Перенос владельцев: резерв — `from` со строки, `to` с заголовка; отгрузка — `to` со строки, `from` = заказ для исходящей и владелец возврата для входящей; перемещение — бывшие allocation становятся повторными строками, free-остаток строки — пара NULL; корректировка — оба NULL. Поле варианта в `store_product` нет: в снимке `variant` остаётся `NULL`. Код региона в снимке — тот, что даёт `store_code` на момент вставки.

Номер: `series` = префикс вида на момент создания (`OMS`, `PO`, …), `sequence_number` мигрированных строк = прежний id заголовка, поэтому `OMS-12` остаётся `OMS-12`. URL вида не меняется: путь по-прежнему `/{kind}/{sequence_number}`. `store_document.id` — внутренний FK. Смена префикса в настройках не переименовывает старые документы.

Заголовки не сливать в широкую таблицу. `store_stock_transaction` остаётся журналом фактов. `document_type=return` в журнале допустим как класс факта возврата, не как таблица.

Потребность производства — проведённый Reservation с местом `production_order`: те же строки универсальной модели, без проводки журнала. Карточка PO по-прежнему создаёт такой резерв только на заказ клиента. План остаётся суммой строк заказа на производство. «В производстве» в атласе — количество этих назначений на заказ клиента и товар. Текст закрытия: «Закрытие снимет невыполненную потребность. Складской остаток не списывается. Завершённые выпуски и связанные документы не отменяются.»

## Verification

**Commands:**

- `npm run lint` -- expected: без ошибок
- `npm run typecheck` -- expected: без ошибок
- `npm run build` -- expected: успешная сборка
- `npm run check:deps` -- expected: без ошибок
- `npm run check:docs` -- expected: без ошибок
- `npm run check:static-images` -- expected: без ошибок

**Manual checks (if no CLI):**

- Создать заказ на производство, добавить товар, изменить количество: в журнале нет прихода на место производства, подпись товара не меняется при правке справочника.
- Провести выпуск: остаток появляется на складе завода.
- Открыть старую отгрузку после переименования товара: название и SKU из снимка.
- Повтор того же SKU с тем же владельцем отклонён; с другим владельцем — принят.
