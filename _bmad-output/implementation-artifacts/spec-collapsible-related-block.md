---
title: 'Сворачиваемый блок связанных документов'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** На карточке заказа клиента вторичный блок «Связанные» (резервы и возвраты) всегда развёрнут и занимает место над таблицей товаров, хотя это не основной ход заказа.

**Approach:** Сделать этот блок разворачиваемым: по умолчанию свёрнут, по клику на заголовок открывается текущее содержимое.

</frozen-after-approval>

## Implementation Notes

- Меняется `src/features/logistics/ui/order-progress-tracker.tsx` (блок `secondaryStages`), `tests/unit/order-progress-tracker.test.tsx` и одна фраза в `docs/features/logistics.md`.
- `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` из `@/components/ui/collapsible`, `defaultOpen={false}` как в `result-panel.tsx`; шеврон `ChevronDown` с `group-data-[open]:rotate-180`. Padding и hover на триггере, чтобы кликалась вся шапка блока.
- В свёрнутом виде виден заголовок «Связанные» и шеврон; колонки резервов/возвратов, карточки и overflow-действия скрыты. Состояние не персистить.
- Не трогать primary journey, шапку заказа, shared `RelatedDocumentsBoard`.
- Blind hunter: восстановлен случайно повреждённый `spec-customer-order-status-tracker.md` (не в скоупе). Сводку в свёрнутом заголовке не добавляли — не просили. Браузер: OMS-905 свёрнут по умолчанию, раскрывается до RSV-7/RET-905, повторный клик сворачивает.

## Review Triage Log

- medium — padding на корне, а не на триггере: подтверждено, клик по полям шапки не тогглил; padding/hover перенесены на `CollapsibleTrigger`.
- medium — `docs/features/logistics.md` описывал резервы/возвраты как всегда видимые тихие колонки: подтверждено; фраза обновлена на свёрнутый блок «Связанные».
- medium — повреждён `spec-customer-order-status-tracker.md` (`status: don`, снят frozen): это не наш дифф; файл восстановлен из HEAD.
- low — тест не проверял повторное сворачивание: добавлен второй клик. Остальные пробелы (клавиатура, aria-expanded, closed-order) покрыты нативным button/Collapsible и существующим тестом `canAct=false`.
- false — oneshot-спека без I/O matrix/AC/Code Map: так устроен route `oneshot`.
- false — нет сводки в свёрнутом заголовке: в intent не просили, компактность как раз цель.
- false — overflow-действия внутри панели: ожидаемо, сворачивается весь вторичный блок.
- false — citation `pricelist-formula-reference` для `defaultOpen={false}`: заметка спеки, код уже берёт паттерн из `result-panel.tsx`.

