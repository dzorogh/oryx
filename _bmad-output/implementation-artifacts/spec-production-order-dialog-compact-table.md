---
title: 'Компактная таблица заказа на производство'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/conventions/ui/english-labels.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Окно создания заказа на производство либо перегружает строку склада пятью равнозначными колонками, либо (в текущем WIP) уводит итог в отдельную правую панель. Пользователь должен сам собирать «сколько ещё нужно произвести» и что произойдёт по кнопке.

**Approach:** Реализовать выбранный вариант A: знакомая компактная таблица с иерархией товар → потребность → количество, итогом и CTA внизу. Двухпанельный планировщик C заменить. Бизнес-логика создания и резервирования не меняется.

</frozen-after-approval>

## Implementation Notes

- Работать поверх текущего незакоммиченного WIP с явного разрешения пользователя; не откатывать смежные правки.
- Основной файл: `src/features/logistics/order-action-forms.tsx`, `ProductionFromOrderForm`.
- Колонки: Product / Need / Make. Остальные балансы (ordered, reserved, in production) — вторичная строка под товаром.
- Footer: резюме + «Quantity will be reserved automatically» + Cancel + CTA вида `Create order · 3 pcs`.
- CTA суммирует количество только если у выбранных строк одна единица; иначе показывает число товаров.
- Дата необязательная; при выбранной дате показать относительный срок.
- Подписи производителя оставить кодом площадки: юридические имена слишком длинные.
- Не добавлять бейдж Recommended: нет отдельного поля «рекомендованный завод».
- Если доступен ровно один производитель, выбрать его при открытии.
- Ширина диалога около `sm:max-w-2xl`. Пользовательские строки на английском.
- Пометить `spec-production-order-dialog-two-panel-planner.md` как superseded.
- Двухпанельный UI заменён таблицей Product / Need / Make и footer-резюме; `createProductionForOrder` не менялся.
- `spec-production-order-dialog-two-panel-planner.md` помечен `done` с пометкой, что выбран вариант A.
- После review: пустой итог повторяет empty-state, дата связана через `aria-describedby`, у Make спрятаны native spinners.
- Браузер: OMS-904, автовыбор SH-12, CTA обновляется с 3 pcs на 2 pcs, дата 25.09.2026 даёт «in 7 days», Cancel закрывает без записи. Живой заказ не создавался.
- Коммит не делался: в дереве смешанный чужой WIP, пользователь не просил commit.

## Review Triage Log

- spec without AC/copy matrix — false: oneshot-маршрут сознательно оставляет только Intent + Notes.
- two-panel spec not superseded — false: статус `done` и footnote на A; отдельного статуса superseded в шаблоне нет.
- tests cover only happy path — low, patched: добавлены empty CTA, past/empty relative date и fully-covered empty state.
- optional ignored in inline layout / Russian default — low, rejected: этот диалог не использует inline; дефолтный русский label поля — наследие общего компонента, форма передаёт English + Optional.
- covered order footer still asks for manufacturer — medium, patched: footer повторяет empty-state.
- blank unit treated as mixed — false: у товаров логистики unit обязателен; пустой payload даёт `Create order`.
- plannerQuantity bypasses formatQuantity шт — false: для English UI это намеренно, `formatQuantity` мапит `pcs` → «шт».
- relative date a11y/DST/no calendar date — low, patched a11y (`hint` + `aria-describedby`); DST и дублирование календарной даты отклонены как косметика.
- number spinner collides with unit / no stacked mobile cards — medium/low: spinners спрятаны; card-layout на узком экране отклонён, выбран табличный вариант A, на 390px форма читается.
- no in-flight Create / toast does not link new PO — defer: то же поведение, что у соседних logistics-форм через `runLogisticsAction`, не вызвано этим редизайном.
