---
title: 'Трекер статуса и сроков заказа'
type: 'feature'
created: '2026-09-18'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '34f20b4c7a411752be671ef3a29e6c85fcac132f'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/ui/list-page-toolbar.md'
  - '{project-root}/docs/conventions/ui/english-labels.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Карточка заказа сейчас выглядит как внутренний ops-хаб: редкая сетка действий и документов не читается как статус и сроки для заказчика, а отдельного клиентского статуса у нас не будет.

**Approach:** Переработать шапку и блок связанных документов в компактный горизонтальный трекер прогресса заказа: статус, ожидаемое окончание и четыре основных этапа считываются сразу, без потери рабочих действий менеджера.

## Boundaries & Constraints

**Always:**
- Меняется только UI карточки заказа (`CustomerOrderDetailPage` + связанные визуальные компоненты).
- Ожидаемое окончание заказа остаётся редактируемым менеджером (`expected_end_on`).
- Этапы показывают реальные связанные документы (код, статус, срок если есть) со ссылками как сейчас.
- Доски склада/завода и standalone `RelatedDocuments` на других страницах не ломаются.
- User-facing labels на карточке — English (конвенция проекта).
- Основной путь: Production → Output → Transfer → Shipment; Reservations и Returns показаны вторично и компактно.
- Каждый этап поддерживает несколько документов, включая несколько одновременно активных производств, выпусков или перемещений.
- Активные документы визуально заметнее завершённых; в первую очередь клиент видит их статус, ожидаемый срок и долю заказа.
- Если активен только один документ позднего этапа, предыдущие этапы выглядят пройденными даже без искусственных документов-заглушек.
- Новый документ раннего этапа может появиться после более позднего: трекер не должен скрывать параллельные активные процессы или ложно сводить заказ к одному «текущему этапу».
- Каждый связанный процесс показывает процент состава заказа, который в нём находится.
- Действия менеджера находятся в overflow-меню соответствующего этапа и не конкурируют со статусом заказа.
- Утверждён вариант A (Journey board): фиксированные колонки этапов со стеком кликабельных карточек документов.
- Завершённый процесс остаётся полноценной кликабельной карточкой с номером, статусом, сроком и процентом; только его визуальный вес ниже активного.
- Процент документа равен среднему значению `quantity_in_document / ordered_quantity` по всем строкам заказа (отсутствующая строка даёт 0%, каждая строка имеет равный вес, результат ограничен 0–100%). Так единицы измерения не смешиваются.

**Never:**
- Не добавлять отдельный «клиентский статус» в схему/API.
- Не менять формы действий, строки заказа, ledger, posting RPC или модели документов.
- Не трогать незакоммиченный WIP с русскими лейблами в `logistics-labels.ts` / nav (вне скоупа).
- Не превращать карточку в landing/marketing layout (hero, градиенты ради декора).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open order with docs | OMS open, stages have docs + expected end | Header shows status + deadline; stages show compact progress with codes/status/dates | N/A |
| Empty stage | Stage has zero related docs | Stage visible as pending/empty, no phantom codes | N/A |
| Closed order | `status=closed` | Tracker read-only for actions; status/deadline/history still readable | Create buttons hidden as today |
| No deadline | `expected_end_on` null | Deadline slot shows empty/unset state, not a fake date | N/A |

</frozen-after-approval>

## Code Map

- `src/features/logistics/customer-orders-page.tsx` -- `CustomerOrderDetailPage`: `LogisticsToolbar` + `RelatedDocumentsBoard` с 6 этапами; формы/lines/ledger ниже — не трогать.
- `src/features/logistics/ui/logistics-toolbar.tsx` -- шапка карточки; либо адаптировать, либо заменить order-specific header.
- `src/features/logistics/ui/related-documents.tsx` -- `RelatedDocuments` / `RelatedDocumentsBoard`; shared с `catalog-pages.tsx` — не ломать callers.
- `src/features/logistics/logistics-related.ts` -- `RelatedDocumentItem` + `related*ForOrder`; `meta` несёт status/extras/date через `expectedEndMeta`.
- `src/features/logistics/ui/expected-end-field.tsx`, `ui/status-badge.tsx`, `ui/logistics-code-badge.tsx` -- переиспользовать.
- `docs/features/logistics.md` -- карточка = хаб исполнения; expected end ручной.
- Do not touch: `order-action-forms.tsx`, `logistics-forms.tsx`, `CustomerOrderLinesTable`, `DocumentLedger`, `logistics-api.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/logistics/ui/order-progress-tracker.tsx` (новый) -- компактный премиальный горизонтальный трекер шапки+этапов -- изолировать order UX от shared board.
- [x] `src/features/logistics/order-document-coverage.ts` (новый) -- рассчитать нормализованный процент заказа для каждого связанного документа по строкам заказа.
- [x] `src/features/logistics/customer-orders-page.tsx` -- подключить трекер вместо текущего toolbar+board в detail; сохранить handlers/dialogs.
- [x] `src/features/logistics/ui/related-documents.tsx` -- при необходимости лёгкий polish для shared callers; не менять контракт ломающе.
- [x] `docs/features/logistics.md` -- коротко описать карточку как статус/сроки для заказчика + ops-хаб.

**Acceptance Criteria:**
- Given open order OMS-905-like, when customer opens detail, then status, expected end, and stage progress are readable above the fold without hunting action buttons.
- Given a stage with documents, when viewed, then code + status (+ date if present) remain linkable.
- Given empty stage, when viewed, then it shows pending/empty, not missing.
- Given warehouse/manufacturer detail, when opened, then existing RelatedDocumentsBoard still works.
- Given closed order, when viewed, then create actions stay hidden and tracker remains informative.

## Implementation Notes

- Сравнены три варианта на сценариях с параллельными процессами и единственным активным Transfer; выбран Journey board.
- Трекер — горизонтальные колонки этапов, не вертикальный timeline. Несколько документов в колонке; активные карточки визуально тяжелее завершённых, но завершённые остаются ссылками с номером.
- Пустой ранний этап помечается `done` («Пройдено»), если позже уже есть документы; несколько непустых незавершённых этапов одновременно `current`.
- Процент считается в `order-document-coverage.ts` и навешивается на related-документы в `CustomerOrderDetailPage`. Shared `RelatedDocumentsBoard` не тронут.
- Лейблы карточки оставлены русскими, как у соседнего logistics WIP; `logistics-labels.ts` не менялся.

## Spec Change Log

## Review Triage Log

## Design Notes

Карточка должна читаться как «где заказ и к какому сроку», не как панель CRUD. Плотность выше текущей; типографика и иерархия важнее декора. Действия менеджера не исчезают — только не конкурируют со статусом.

## Verification

**Commands:**
- `npm run typecheck` -- expected: pass
- `npm run test` -- expected: pass (существующие logistics unit)
- `npm run check:ui-english` -- expected: pass на новых user-facing строках (или ignore-file осознанно, как у соседних logistics UI)
- `npm run lint` -- expected: нет новых ошибок в затронутых файлах

**Manual checks:**
- `/store/logistics/customer-orders/{id}` — шапка, этапы, empty/filled, open/closed.
- Warehouse/manufacturer detail — related board без регрессии.
