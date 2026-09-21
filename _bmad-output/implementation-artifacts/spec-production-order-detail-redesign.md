---
title: 'Редизайн карточки заказа на производство'
type: 'feature'
created: '2026-09-21'
status: 'done'
baseline_commit: 'ea18ad797334c6ebf08e3886044bdb0939d9d101'
route: 'full'
route_source: 'auto'
review: 'thorough'
review_source: 'auto'
lenses_ran: ['blind-hunter', 'edge-case-hunter', 'verification-gap', 'intent-alignment']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-oryx-2026-09-21/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-oryx-2026-09-21/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-oryx-2026-09-21/reconcile-current-production-order.md'
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Карточка заказа на производство не читается как один документ и создаёт выпуск с резервом несколькими запросами.

**Approach:** Локальное рабочее место по `DESIGN.md` и `EXPERIENCE.md`. Spine важнее макета и текущего кода: композиция, тексты, состояния, якоря, фокус и доступность берутся оттуда целиком.

## Boundaries & Constraints

**Always:**
- Паспорт: `h1` номер, код производителя, статус, дата, одно действие «Закрыть заказ».
- Якоря `#products` `#outputs` `#movements`; счётчики — строки заказа, документы выпуска, факты до пагинации; разделы подряд.
- Товары: план, свободно, в резерве, выпущено, действие. Код — `LogisticsCodeBadge`. Order и `REG-n` отдельными строками. Без резервов нет disclosure. `0` — ноль, `—` — неприменимо.
- Линия выпуска — одна группа названия, кода, количества и единицы. Разные единицы не суммировать.
- Движения: время, изменение, товар, место, закреплено за, документ. Без «Приход / Расход». Пусто: «Движений пока нет.»
- `≥1024` таблицы, ниже списки `dt`/`dd`, на 320 px одна колонка. В a11y-дереве только одно представление.
- Закрытие только подтверждением. Текст: «Закрытие снимет резервы и спишет весь оставшийся незавершённый остаток; история движений сохранится. Завершённые выпуски и связанные документы не отменяются.» Только `CANCEL_GUIDANCE_PRODUCTION_CLOSE` → `closeEffects`.
- В `closed` ведёт лишь `closeProductionOrder`. `cancelled` только просмотр. `draft`/`planned`/`in_progress`/`done` свободны, `done` операционен. Дата редактируется всегда.
- Выпуск: одна транзакция и `p_request_key` на резерв, заголовок, линии и завершение. Повтор ключа не создаёт второй резерв.
- Сохранить лимиты, ссылки, loading/error, страницу 20. Русский текст. Завод и места — коды.

**Never:**
- Не менять `LogisticsToolbar`, `LogisticsTableCard`, `DocumentLedger` и не оборачивать ledger.
- Не возвращать «Отменить» и выбор `cancelled`. Не дублировать текст закрытия. Не суммировать линии.
- Не показывать названия завода/склада. Не реанимировать `idempotency_key` журнала.
- Не править файлы `ux-oryx-2026-09-21` и не затирать чужой код. Не заводить test suite.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Паспорт | non-terminal / `closed` / `cancelled` | У четырёх рабочих статусов Select; у terminal статус текстом и пояснение «Документ закрыт…» или «Документ отменён: операции с товарами недоступны.» Дата всегда редактируется | Сбой оставляет ввод и ошибку; успех: «Статус сохранён.» / «Ожидаемое окончание сохранено.» |
| Резервы | Есть назначения или нет | Disclosure только при назначениях; строки тип/код/количество | Collapse снимает контейнер и `aria-expanded` |
| Выпуск на экране | Несколько единиц | Каждая линия целиком на любой ширине | Суммы нет |
| Движения | 0 фактов | Раздел виден | — |
| Новый выпуск | Остаток плана, план или завершение, необязательный заказ | Всё или ничего; ключ до успеха, отмены или смены ввода | «Создаём выпуск…»; сбой: «Выпуск не создан. Ничего не сохранено. Можно повторить.» и тот же ключ. Нет строк: «Нет строк с оставшимся количеством для выпуска.» |
| Повтор ключа | Тот же intent | Тот же выпуск | После отката команда идёт заново |
| Закрытие | Подтверждение | Фокус на «Вернуться»; успех фокусирует статус «Закрыт» и говорит «Заказ закрыт. Резервы сняты, остаток списан.» | «Вернуться» без записи; pending без повтора |
| Добавить / резерв | Совместимый товар; резерв только заказу в лимитах | Текущие проверки и пустые тексты | Ошибка сохраняет ввод |

</frozen-after-approval>

## Code Map

- `app/store/logistics/production-orders/[orderId]/page.tsx` — маршрут не менять.
- `production-orders-page.tsx` `ProductionOrderDetailPage` (~289–973) — сейчас toolbar, две кнопки закрытия, disclosure у всех, синтетическое «Свободно», сумма выпуска. `WORKFLOW_STATUSES` (73–75) уже без terminal.
- `ui/document-ledger.tsx` — не менять; брать `documentLedgerRows`, `paginateLedgerRows`, `LEDGER_PAGE_SIZE`. Toolbar и table card не менять.
- Переиспользовать badge, `ManufacturerLink`, `ProductIdentity`, `QuantityField`, `FieldSelect`, `AvailabilityPanel`, `LogisticsDialog`, loading/error, бейджи. Pending-close — локальный `onOpenChange`.
- `expected-end-field.tsx` — опциональные `disabled`, `invalid`, `errorId`; старые вызовы как были.
- `logistics-availability.ts` — breakdown, open order lines, `hrefForOwner`. `logistics-rules.ts` — клиентские assert; RPC те же пределы.
- `createProductionOutput` (api 642–687) заменить RPC. `closeProductionOrder`, статус, строка, дата — как есть.
- `order-action-forms.tsx` ~603 и `flow-documents-pages.tsx` ~565 — только ключ, без новой вёрстки.
- `CANCEL_GUIDANCE_PRODUCTION_CLOSE` (cancel-guidance 33–34); диалог читает `projectCancelGuidance` (320–328).
- Образец: `store_shipment_request` в `20260921160000_store_unified_shipment.sql`. Проводки: `store_post_reservation`, `store_complete_output` из `20260921120000_store_stock_transaction_facts.sql`.
- `docs/features/logistics.md` — PO больше не «Отменить» и не «удалить WIP»; выпуск атомарен. UX-файлы только читать.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/20260921210000_store_create_production_output.sql` — `store_output_request` + `store_create_production_output`: lock, повтор ключа возвращает id, иначе одна транзакция. Отклонять terminal заказ, сверх плана и сверх свободного/открытого. Применить один раз MCP `oryx-supabase`; вторую копию файла не создавать.
- [ ] `src/features/logistics/logistics-api.ts` — `requestKey`, только новая RPC.
- [ ] `src/features/logistics/order-action-forms.tsx`, `src/features/logistics/flow-documents-pages.tsx` — ключ до успеха, закрытия или смены ввода.
- [ ] `src/features/logistics/logistics-cancel-guidance.ts` — новый текст константы, форма та же.
- [ ] `src/features/logistics/ui/expected-end-field.tsx` — опциональные disabled/invalid/errorId.
- [ ] `src/features/logistics/ui/production-order-document-header.tsx`, `production-order-section-index.tsx`, `production-order-product-manifest.tsx`, `production-order-outputs.tsx`, `production-order-movements.tsx`, `production-order-close-dialog.tsx` — локальные блоки; таблица и список не вместе (`lg`/`max-lg`).
- [ ] `src/features/logistics/production-orders-page.tsx` — сборка; убрать toolbar и оба старых закрытия только здесь.
- [ ] `docs/features/logistics.md` — согласовать PO, закрытие, выпуск, имя миграции.

**Acceptance Criteria:**
- Given `done` и свободный остаток, when карточка открыта, then статус, дата, резерв и выпуск доступны, «Отменить» нет.
- Given товар без резерва и товар с order+region, when смотрят товары, then disclosure только у второго, каждое назначение отдельно.
- Given две единицы в выпуске, when любая ширина, then линии не сложены.
- Given 0 движений, when страница открыта, then раздел виден.
- Given закрытие, when подтвердили, then только `closeProductionOrder`, фокус на статусе.
- Given клавиатура, when якорь, disclosure, пагинация и закрытие, then фокус по `EXPERIENCE.md`.

## Implementation Notes

- `store_create_production_output` пишет резерв с `origin = 'manual'`: проверка таблицы допускает только `manual` и `order_close`. Живая функция заменена тем же телом.
- Пагинация движений — кнопки с `disabled`, фокус остаётся на активном контроле, если он не погас.
- На 320 CSS px якоря переносятся, горизонтального переполнения документа нет.
- Браузер на PO-1: паспорт, код SH-7, без «Отменить», диалог закрытия с утверждённым текстом и фокусом на «Вернуться», Escape-якорь «Выпуски» фокусирует `h2`. Текущих резервов на заказах нет, поэтому disclosure проверен отсутствием кнопки. Заказ не закрывался и новые документы не создавались.
- `npm run lint` падает на прежних файлах tracker/comments и эффектах `order-action-forms`, которых этот diff не добавлял. `npm run check:deps` падает на уже установленном расхождении версий, `package.json` не менялся.

## Spec Change Log

## Review Triage Log

Проход thorough, итерация 0. Вердикты: false 16, low 6 (все закрыты прямым патчем), medium 4 (патч), medium 1 (defer).

- false — дата в terminal редактируется. Спека прямо требует правку ожидаемого окончания в любом статусе.
- false — лимит плана считает только `done`. Так же считает прежний `outputtedForProductionLine`; RPC повторяет этот предел, а не вводит новый.
- low → patch — резерв мог превысить количество выпуска. Клиент и SQL отклоняют `allocation.quantity > quantity`.
- low → patch — RPC не проверял, что заказ клиента открыт. SQL требует `status = open`.
- false — резервы по умолчанию свёрнуты. Spine не требует авто-раскрытия.
- false — нет вложенной строки «Свободно». Spine запрещает её.
- false — документация не описывает каждую панель. Обязательный абзац про закрытие, RPC и имя миграции уже есть.
- false — `store_output_request` не вынесен в раздел модели. Список миграций содержит файл; отдельная сущность в модели не была задачей.
- false — успех закрытия без toast. Spine требует live-текст, он в `sr-only`.
- false — убрана подсказка «Только товары этого завода». Её нет в канонических пустых текстах.
- false — индекс не читает hash. `update()` на mount смотрит геометрию после прокрутки hash.
- false — клик мышью не фокусирует `h2`. Spine запрещает уводить фокус при pointer activation.
- false — ключ меняется на каждый ввод. Спека требует новый ключ при смене ввода.
- false — нет сгенерированных типов БД. Клиент ходит через `rpcJson`, кодогенерации в этом пути нет.
- false — закрытие не на `LogisticsDialog`. Спека требует отдельный диалог.
- medium → patch — двойной «Сохранить план» / «Завершить выпуск» с одним ключом. Стоит синхронный lock на карточке, в списке выпусков и в форме заказа клиента.
- medium → patch — ошибка `reload` после успешного выпуска или закрытия показывалась как провал команды. Успех фиксируется до reload.
- low → patch — `allocation.productId` молча игнорировался. Клиент отклоняет расхождение с товаром выпуска.
- low → patch — «Закрыть заказ» можно было нажать во время сохранения статуса или даты. Кнопка `disabled`.
- low → patch — мышиный якорь не обновлял `aria-current`, если прокрутки не было. `setCurrent` вызывается и для pointer.
- false — поздний `hashchange` не фокусирует заголовок. Фокус обязателен для клавиатуры и первого hash; pointer его не забирает.
- medium → defer — нет автотеста атомарного `store_create_production_output`. Утверждённая спека запрещает новый test suite; проверка этого пути — браузер и SQL.
- medium → patch — тест текста закрытия искал старые фразы. Утверждения обновлены, `tests/unit/logistics-cancel-guidance.test.ts` проходит.
- false — intent alignment не нашёл другого чтения, чем совместная поставка экрана и атомарной команды. Diff это и делает; отсутствие тестов учтено строкой выше.

## Design Notes

Ключ как у отгрузки: после commit повтор возвращает id, после rollback строка ключа не сохранена. Два вида раздела — CSS `lg` 1024 px, не хук. Общие таблицы не ветвятся.

## Verification

**Commands:**
- `npm run lint` — без ошибок
- `npm run typecheck` — без ошибок
- `npm run build` — успешная сборка
- `npm run check:deps` — без ошибок
- `npm run check:docs` — без битых ссылок
- `npm run check:static-images` — без ошибок

**Manual checks (if no CLI):**
- `http://localhost:3000/store/logistics/production-orders/1`: desktop, 768–1023, 320 CSS px. Якоря, резервы, «Вернуться», подтверждение. Без тестовых строк в базе. Фокус: якорь → `h2`, disclosure Enter/Space, диалог с «Вернуться».
