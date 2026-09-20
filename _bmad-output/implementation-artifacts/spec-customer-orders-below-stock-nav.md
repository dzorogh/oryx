---
title: 'Заказы клиента ниже остатков в навигации'
type: 'chore'
created: '2026-09-20'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** В навигации магазина пункт «Заказы клиента» расположен выше пункта «Остатки», хотя пользователю нужен обратный порядок.

**Approach:** Переставить два элемента обзорной навигации так, чтобы «Остатки» отображались первыми, а «Заказы клиента» — сразу под ними, не меняя маршруты и остальную структуру меню.

</frozen-after-approval>

## Implementation Notes

- Изменён только порядок элементов `LOGISTICS_OVERVIEW_NAV_ITEMS` в `src/features/logistics/logistics-nav.ts`: «Остатки» теперь идут перед «Заказы клиента». Маршруты и остальные группы навигации не менялись.
- В `tests/unit/nav-rail-store.test.ts` добавлена регрессия, фиксирующая непосредственное соседство пунктов в нужном порядке.
- Проверки: `typecheck`, 441 unit-тест, `check:ui-english`, `check:static-images` и ESLint затронутых файлов прошли. Полный `npm run lint` блокируется 11 существующими ошибками в несвязанных компонентах Tracker, Comments и Logistics.

## Review Triage Log

- `false` — несвязанный brainstorming-артефакт существовал до этой задачи и по подтверждению пользователя сохраняется без изменений; он не расширяет scope спецификации.
- `false` — `LOGISTICS_OVERVIEW_NAV_ITEMS` фактически потребляется меню магазина; агрегат `LOGISTICS_SUBNAV_ITEMS` больше нигде не используется, поэтому дополнительное поведение не изменено.
- `low / patch` — отсутствовала регрессия порядка пунктов; добавлен тест для `STORE_PRIMARY_NAV_ITEMS`.
- `false` — статус `in-progress` и отсутствие итогов проверки были ожидаемым промежуточным состоянием до завершения review/verification.
- `false` — brainstorming-мемлог явно остановлен пользовательским решением сначала изучить данные; незавершённость не является дефектом этой задачи.
- `false` — русские подписи уже существовали и не менялись; проверка `check:ui-english` не обнаружила новых нарушений.
