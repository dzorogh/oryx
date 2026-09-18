---
title: 'Allocation Atlas для товаров заказа клиента'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/docs/features/logistics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Текущая широкая таблица строк заказа перегружена операционными колонками и не позволяет быстро понять, сколько каждого товара заказано, произведено под этот заказ, находится в пути, зарезервировано на конкретных складах и уже отгружено.

**Approach:** Заменить её компактной матрицей Allocation Atlas: `Product | Ordered | Produced | In transit | WH-* | Shipped`, где склады формируются по фактическим резервам строк заказа. `Ordered` и крайний `Shipped` визуально выделены; только полностью отгруженные строки получают мягкое success-выделение и галочку в `Shipped`, остальные строки не получают сигнальной подсветки.

</frozen-after-approval>

## Implementation Notes

- `Produced` — накопительный объём проведённых выпусков под конкретную строку заказа: положительные `production_output`-транзакции в склад, с fallback на legacy output allocations без двойного счёта.
- `In transit` и `WH-*` показывают только текущий `reserved` этой строки заказа; свободный товар и резервы других заказов исключены.
- Сохранить Reserve, Ship и Release через компактное overflow-меню; бизнес-логику документов и форм не менять.
- Реализация: `src/features/logistics/ui/customer-order-lines-table.tsx`, небольшой расчётный helper и unit/RTL-тесты.
- Helper: `src/features/logistics/allocation-atlas.ts`. `Produced` суммирует складские `production_output` ledger-строки этой COL (включая сторно), а allocations добавляет только для `done`/отсутствующего output, если этот output ещё не встречался в ledger. Planned/cancelled allocations не считаются. Не равен текущему reserved+shipped.
- Колонки складов — только склады с `reserved` этого заказа, сортировка по реальному коду (`numeric` localeCompare). Резерв на PO/transfer остаётся в Release, отдельных колонок нет.
- UI: shadcn Table/Card/DropdownMenu, английские строки, без `english-ui:ignore-file`. Книжные колонки Ordered/Shipped, complete-row только при `shipped >= ordered` (ε), без shortage/risk. Product sticky+truncate (`max-w-56`). Горизонтальный скролл — контейнер Table.
- Тесты: `tests/unit/allocation-atlas.test.ts` (ledger / fallback / no double count / planned skip / allocation-only locations), `tests/unit/customer-order-lines-table.test.tsx` (English headers, complete check, compact menu, matrix qty).
- Overflow-меню Reserve/Ship/Release стоит справа в sticky-ячейке Product; колонки строго `Product | Ordered | Produced | In transit | WH-* | Shipped`, без колонки Actions.
- Формы, API, миграции и соседние страницы не менялись. Коммит не создавался по запросу пользователя.
- После независимого ревью заголовки складов стали компактными ссылками, Release-меню снова показывает количество и контекст места, sticky-ячейки получили непрозрачный фон, а таблица — доступный caption.
- Проверка Produced ограничена reserved warehouse-транзакциями выпуска; нулевые ledger-строки не блокируют legacy fallback. Документация поведения обновлена.
- Сфокусированные 17 тестов, typecheck, UI-English и static-images прошли. Полный lint и полный test блокируются несвязанными изменениями рабочего дерева; затронутые файлы проходят отдельный ESLint.
- Уточнение к ранней заметке: пользователь не запрещал коммит; финальный BMAD workflow создаёт локальный коммит только из файлов этой задачи.

## Review Triage Log

- **medium / patched** — `docs/features/logistics.md` не описывал Allocation Atlas; добавлено актуальное поведение карточки заказа.
- **false** — пустой EXPERIENCE другого UX-сеанса `ux-oryx-2026-09-18-5` не относится к этой реализации и намеренно не изменялся.
- **false** — DESIGN другого UX-сеанса `ux-oryx-2026-09-18-5` не относится к карточке заказа и намеренно не изменялся.
- **false** — имя + SKU и числа без единицы соответствуют утверждённому плотному прототипу; замена на старый PRD-badge ухудшила бы выбранную модель.
- **medium / patched** — коды складов были некликабельными; сделаны компактными ссылками на карточки складов.
- **medium / patched** — Release-меню теряло количество и подсказку места; детали восстановлены без расширения таблицы.
- **false** — пояснение уже корректно описывает Produced и текущие reserved-колонки в контексте всего заказа.
- **low / rejected** — исчезновение складской колонки после снятия последнего текущего резерва соответствует динамической snapshot-модели; история мест в scope не входит.
- **false** — нулевые количества намеренно отображаются тире; отрицательный итог Produced недостижим при валидном журнале и не является отдельным состоянием UI.
- **low / deferred** — первая Implementation Note неточно формулирует учёт сторно Produced; документальное уточнение записано в deferred-work, тестовые claims проверены отдельно.
- **medium / patched** — RTL не покрывал Produced, два склада, natural sort и empty state; интеграционные проверки добавлены.
- **medium / patched** — полупрозрачный фон sticky Product мог просвечивать; фон сделан непрозрачным, clipping перенесён на текстовый контейнер.
- **low / patched** — у таблицы не было семантического описания; добавлен скрытый TableCaption.
- **medium / patched** — Produced принимал неподходящие stock state и нулевой шум; фильтрация ужесточена, fallback защищён тестом.
- **false** — изменение `store-catalog-page.test.tsx` появилось параллельно и не принадлежит этой реализации.
