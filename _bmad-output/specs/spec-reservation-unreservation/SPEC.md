---
id: SPEC-reservation-unreservation
companions:
  - operational-model.md
  - brownfield.md
  - ../../planning-artifacts/architecture/architecture-oryx-2026-09-17/ARCHITECTURE-SPINE.md
sources:
  - ../../brainstorming/brainstorm-booking-cancellation-storno-2026-09-17/brainstorm-intent.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Бронирование и снятие брони

## Why

**Боль:** у бронирования, снятия брони и сторно пересекающиеся смыслы. Posted RSV можно «отменить» сторно журнала; это скрывает фактическое место товара и создаёт фантомные остатки, если резерв уже уехал на другой склад. Оператору и БД нужна одна читаемая модель: posted документы не правятся, резерв снимается только новым документом снятия.

## Capabilities

- **CAP-1**
  - **intent:** Оператор проводит бронирование и переводит свободное количество SKU в резерв конкретного заказа на выбранном месте.
  - **success:** После проведения RSV остаток места показывает `free − qty` и `reserved(order, line) + qty`; попытка превысить free места или открытую потребность строки отклоняется без записи журнала.
- **CAP-2**
  - **intent:** Оператор проводит снятие брони и возвращает фактический резерв заказа на выбранном месте в свободный остаток.
  - **success:** После проведения REL `reserved` выбранного ключа уменьшается, `free` увеличивается на то же qty; превышение фактического резерва отклоняется; REL не содержит `reservation_id`.
- **CAP-3**
  - **intent:** Оператор перемещает свободный и/или зарезервированный товар; тип остатка и заказ резерва сохраняются.
  - **success:** Строка перемещения указывает источник (`free` или `reserved` + заказ/строка); проведение делает `−qty` на источнике и `+qty` того же типа на назначении; RSV не меняет статус и не сторнируется.
- **CAP-4**
  - **intent:** Оператор отгружает зарезервированный товар в заказ; снятие брони после отгрузки трогает только оставшийся складской резерв.
  - **success:** Отгрузка уменьшает warehouse `reserved` и увеличивает `shipped` на месте заказа; REL при нулевом reserved выбранного ключа не создаёт складского эффекта (или отклоняется как пустая), но не реверсирует RSV и не трогает `shipped`.
- **CAP-5**
  - **intent:** Оператор освобождает резерв только через REL; posted RSV и REL нельзя сторнировать.
  - **success:** Карточки RSV/REL не показывают действие «Отменить / сторно»; `logistics_cancel_document` для `reservation` и `reservation_release` возвращает ошибку; posted документы и их строки журнала остаются.

## Constraints

- Учёт только количества SKU; партий, серий и конкретных единиц нет.
- Резерв всегда принадлежит заказу (и строке заказа); свободный остаток заказа не имеет.
- Нельзя забронировать больше `free` на месте или больше `ordered − shipped − reserved` строки заказа.
- Нельзя снять больше фактического `reserved` ключа `(place, order, line)`.
- Нельзя переместить больше доступного остатка выбранного типа на источнике.
- У одного заказа может быть несколько posted RSV одного SKU; количество одной строки брони может лежать на нескольких местах после перемещений.
- Источник остатков — журнал `logistics_stock_transaction`; posted RSV/REL пишут движения и не реверсируются.
- Исторические `cancelled` RSV/REL могут остаться в БД; новые cancel этих kind запрещены.
- Закрытие заказа создаёт posted REL на фактический reserved, а не reverse исходных RSV.

## Non-goals

- Партии, серийные номера, поединичный учёт.
- Отдельный тип документа «частичное снятие»; частичность = qty в строках REL.
- Статус `cancelled` как рабочий путь для RSV/REL.
- Сторно (`logistics_reverse_source`) как undo брони или снятия.
- Снятие сторно с отгрузки, возврата, выпуска и перемещения — вне этой спецификации.
- Производственное потребление сырья (сырья нет).

## Success signal

На сценарии «RSV на складе A → перемещение reserved на склад B → снятие брони» товар остаётся на B как `free`, журнал содержит posted RSV, posted transfer и posted REL без `reverses_transaction_id` у этих источников, а кнопка сторно RSV отсутствует. Попытка cancel posted RSV через API завершается ошибкой.

## Assumptions

- Существующие таблицы RSV/REL, журнал и RPC `logistics_post_reservation` / `logistics_post_release` сохраняются; меняется запрет cancel/reverse этих kind и UI.
- Сторно shipment / transfer / return / output не удаляется этой работой, но не используется вместо REL.
