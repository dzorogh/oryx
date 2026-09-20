---
title: 'Перемещения без черновиков'
type: 'refactor'
created: '2026-09-20'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'af14dde695cda85471623f1e2d14c8f12e14e26c'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
  - '{project-root}/docs/features/logistics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Перемещение можно сохранить как Draft и отправить позже, хотя пользователь ожидает, что создание сразу отправляет товар. Отдельный Draft усложняет статусы, редактирование и проверку доступности.

**Approach:** Оба входа создания выполняют одну атомарную create-and-send операцию, возвращают новое перемещение в статусе `sent` и открывают его detail. Существующие demo Draft проводятся через серверную отправку, а не прямое обновление статуса.

## Boundaries & Constraints

**Always:** общий вход перемещает только free stock; вход из заказа сохраняет owner заказа для выбранного количества; отправка пишет append-only ledger только серверной RPC; create-and-send атомарна и идемпотентна; остаток проверяется в той же транзакции; успешный вызов возвращает transfer id; существующие Draft мигрируются через `store_send_transfer` в порядке id.

**Never:** прямой `UPDATE status='sent'`; клиентские вставки в ledger; изменение Draft-поведения Reservation, Production, Shipment или Return; изменение Complete/Cancel и Reserve-on-transfer; очистка существующих transfer документов.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Generic create | Разные склады, уникальные товары, quantity ≤ free Available | Одна RPC создаёт документ, строки, отправляет free stock и возвращает `{id,status:'sent'}` | Транзакция откатывается целиком |
| Order create | Строки одного заказа с owner allocation и quantity ≤ reserved Available | Одна RPC сохраняет owner и отправляет выбранное количество | Невалидный owner/quantity возвращает ошибку без частичного документа |
| Retry | Повтор с тем же request key | Возвращается тот же sent transfer id без повторных движений | Новый документ не создаётся |
| Stale stock | Остаток уменьшился до submit | Документ не создаётся, stock не двигается | Диалог сохраняет ввод и показывает актуальную ошибку |
| Existing Draft | Валидный demo transfer в статусе `draft` | Миграция вызывает `store_send_transfer`, документ становится `sent`, ledger согласован | Любая ошибка прерывает миграцию |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260919010000_store_owner_reservations.sql` — текущие owner-aware `store_send_transfer`, `store_move`, idempotency keys и схема transfer; переиспользовать, не дублировать ledger-логику.
- `supabase/migrations/20260920122000_store_transfer_direct_send.sql` — новая атомарная RPC, request key, валидация payload, server-side uniqueness и backfill Draft через `store_send_transfer`.
- `src/features/logistics/logistics-api.ts` — заменить browser insert sequence на typed RPC, возвращающую id/status.
- `src/features/logistics/transfers-page.tsx` — generic free-only submit, direct Send, навигация; убрать Draft filter, Send и line editing из detail.
- `src/features/logistics/order-action-forms.tsx` — order-owner submit через ту же RPC и переход на sent detail; `ReserveOnTransferForm` не менять.
- `src/features/logistics/logistics-types.ts`, `logistics-labels.ts`, `ui/status-badge.tsx` — удалить Draft из публичного transfer status vocabulary.
- `scripts/lib/seed-logistics-stories.mjs` — создавать story transfers через direct-send RPC до Complete.
- `docs/features/logistics.md` — заменить `draft → sent → delivered` на `sent → delivered`.
- `tests/unit/transfer-direct-send.test.tsx` — покрыть статусы, оба payload adapter, навигацию и отсутствие Draft actions.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260920122000_store_transfer_direct_send.sql` — добавить идемпотентную атомарную RPC и ledger-safe backfill существующих Draft; запретить duplicate product lines на сервере.
- [x] `src/features/logistics/logistics-api.ts` — добавить typed create-and-send client и удалить transfer create sequence из UI.
- [x] `src/features/logistics/transfers-page.tsx` — отправлять generic free stock сразу, открывать detail и сделать sent lines read-only.
- [x] `src/features/logistics/order-action-forms.tsx` — отправлять выбранный order-owned stock сразу и открывать detail.
- [x] `src/features/logistics/logistics-types.ts`, `logistics-labels.ts`, `ui/status-badge.tsx` — убрать Draft из transfer UI/status contract.
- [x] `scripts/lib/seed-logistics-stories.mjs`, `docs/features/logistics.md` — синхронизировать demo seed и документацию.
- [x] `tests/unit/transfer-direct-send.test.tsx` — зафиксировать happy/error/retry/status/navigation сценарии.
- [x] Oryx demo Supabase — применить миграцию и подтвердить отсутствие `draft`; текущий снимок содержит 3 `delivered` и 0 `draft`, поэтому backfill на нём ожидаемо no-op.

**Acceptance Criteria:**
- Given valid free или order-owned stock, when пользователь создаёт transfer, then одна RPC атомарно создаёт и отправляет документ, UI открывает `/store/logistics/transfers/:id`, а статус равен `sent`.
- Given повтор того же submit, when request key совпадает, then новый transfer и повторные ledger rows не создаются.
- Given недостаточный остаток или невалидная строка, when RPC завершается ошибкой, then header, lines, allocations и ledger не содержат частичного результата.
- Given приложение и demo database после миграции, when запрашиваются transfer статусы и действия, then Draft отсутствует в фильтрах, badges, create CTA и detail actions.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- `false` — BH1/generic `resetForm` on close: после ошибки диалог остаётся открытым с тем же ключом (`create` вызывает `resetForm` только при `ok`). Закрытие — отказ от попытки, не retry из матрицы.
- `low` — BH2/order `reset()` on open: тот же отказ/повторное открытие. Повседневный retry оставляет диалог открытым; отвергнуто как маловероятное + хранение ключа между открытиями добавляет состояние.
- `false` — BH3/VG23 replay non-`sent`: UI после успеха меняет ключ. Повтор ещё `sent` проходит. Повтор после complete/cancel не должен открывать detail как успешный send.
- `false` — BH4 navigate-before-reload: `TransferDetailPage` монтируется заново, `isLoading` стартует `true` при настроенном Supabase и сам грузит уже записанный документ.
- `medium` — BH5 клиент всё ещё может вставить `store_transfer` со статусом `draft`: демо-RLS/GRANTs на таблицах открыты, как и раньше. Не дыра нового UI-пути.
- `medium` — BH6 anon может удалить строку `store_transfer_request`: та же открытая RLS-конвенция демо, что и у остальных `store_*` таблиц.
- `low` — BH7 публичные `p_id`/`p_created_at`: нужны seed; тот же trust model, что у `store_reset_logistics_stories`. Отвергнуто.
- `false` — BH8 unique index без preflight: дубликаты и должны валить миграцию. На демо индекс применился.
- `low` — BH9/ECH18 пустой draft в backfill станет `sent` без движений: `store_send_transfer` так устроен. На демо 0 draft, миграция уже применена. Отвергнуто — guard добавляет ветку ради несуществующих строк.
- `false` — BH10/ECH17 leftover draft / пустой badge: после миграции draft нет; непубличный статус не обязан иметь label.
- `false` — BH11 mermaid `Document draft`: общая схема всех документов (Reservation/Production всё ещё draft), не lifecycle transfer.
- `low` — BH12 CTA `Send` vs `Отправить`: два входа этой истории расходятся в подписи. Прямая правка label.
- `low` — BH13 колонка «На складе А»: была до рефакторинга. Отвергнуто — убирать колонку не требовал intent.
- `false` — BH14 `owner_id` без `owner_type`: `store_assert_owner(null, id)` бросает `Owner type and id must both be set`.
- `medium` — BH15/VG20 у `TransferReservedForm` нет теста retry/того же `p_request_key` после stale-stock.
- `false` — BH16a `status-badge.tsx` не в diff: `TransferStatusBadge` уже сидит на `TransferStatus` без `draft`.
- `low` — BH16b нет перевода `Expected sent transfer`: ошибка уйдёт в toast сырым английским.
- `low` — ECH19 `crypto.randomUUID()` в insecure context: демо HTTPS/localhost. Отвергнуто — try/catch добавляет guard ради недостижимого контекста.
- `medium` — VG21 миграционный тест не фиксирует `store_send_transfer(v_id)` и select/insert `store_transfer_request` на create-пути.
- `medium` — VG22 нет проверки, что reset удаляет `store_transfer_request` до `store_transfer`.

## Design Notes

В базе `draft` может оставаться только как непромежуточно наблюдаемое внутреннее состояние внутри транзакции RPC: строка вставляется, `store_send_transfer` проводит ledger, и commit публикует только `sent`. Публичный клиент не создаёт Draft. `On hand` суммирует физический остаток склада по всем owners; generic `Available` использует free/null-owner, order `Available` — reserved для текущего owner.

## Verification

**Commands:**
- `npm run lint` — без lint errors.
- `npm run typecheck` — transfer status union и RPC client типизируются.
- `npm run test` — unit/regression suite проходит.
- `npm run check:ui-english` — новые и изменённые UI labels на английском.
- `npm run check:static-images` — asset policy не нарушена.

**Manual checks:**
- В Oryx demo Supabase нет transfer со статусом `draft`; создание free и order transfer даёт `sent` и согласованные ledger balances.
