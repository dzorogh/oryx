---
title: 'Выравнивание полей в шапках модалок'
type: 'bugfix'
created: '2026-09-28'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** В модалках логистики («Новое перемещение» и похожих) поля ввода в одной строке стоят на разной высоте. `space-y-*` в Tailwind v4 даёт `margin-bottom` всем детям, кроме последнего. Base UI `Select` рендерит скрытый `<input>` после триггера, поэтому триггер получает лишние 4px снизу, и `FieldSelect` с вариантами (60px) выше пустого `FieldSelect` (56px). `ExpectedEndField` подписан инлайн-`span` и в сумме занимает 52px.

**Approach:** Сделать обёртки полей колонкой `flex flex-col gap-*`: скрытый input с `position: fixed` не участвует в flex-раскладке. Подпись `ExpectedEndField` сделать блочной. Та же правка для всех мест, где `Select` лежит прямо в `space-y-*`, и подгонка отступов у стрелки и текстовых подсказок, выровненных по низу строки.

</frozen-after-approval>

## Implementation Notes

- Общие компоненты: `FieldSelect` и `ExpectedEndField` (по умолчанию) — `flex flex-col gap-1`, подпись даты блочная. Теперь все поля в шапке модалки 56px (подпись 20 + 4 + контрол 32).
- Стрелка «→» в перемещении и «Назначение: Свободно» в резервах: `mb-2` → `mb-1.5`, центр по контролу.
- Та же замена `space-y-*` → `flex flex-col gap-*` в `order-line-dialog`, фильтрах остатков, команде, профиле, настройках магазина и во всех filter-sheet логистики и каталога (обёртки вокруг `CatalogQuickSelectControl`).
- Проверено в браузере: «Новое перемещение» и «Новый заказ на производство» — у всех полей одинаковые верх и низ контрола; в листе фильтров каталога зазор 6px, снизу 0.
- Уже падали до этой правки: `lint` (tracker, comments), один тест `document-timeline`, `check:deps` (устаревшие пакеты).

## Review Triage Log

- medium — `CatalogQuickSelectControl` в `space-y-1.5` в filter-sheet — подтверждено, исправлено.
- low — `store-settings-page.tsx:259` инлайн-подпись в `space-y-1` — исправлено одной заменой.
- false — `customer-order-catalog-dialog` не обновлён: строка `items-start`, блоки «Источник» и «Срок» уже 20+4+32 = 56, как новый `FieldSelect`.
- low, отклонено — `mb-1.5` зависит от `h-8`: все триггеры в этих строках `h-8`, обёртка добавила бы код без пользы.
- medium, отложено — ошибка или подсказка под полем в строке `items-end` поднимает контрол; было и до правки.
- отложено — нет конвенции или проверки против `space-y` вокруг Base UI `Select`.
- отложено — английские подписи в `team-directory-page` и `profile-deputy-section`; было до правки.

