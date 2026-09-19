---
name: Oryx owner reservations
status: final
sources:
  - ../../../specs/spec-order-and-region-reservations/SPEC.md
  - DESIGN.md
  - docs/features/logistics.md
updated: 2026-09-19
---

# Oryx owner reservations — Experience Spine

## Foundation

Настольный веб Store Logistics (Next.js, shadcn, Tailwind). Одна роль: менеджер обеспечения. Подписи новых и переписанных поверхностей — English. Visual identity: `{DESIGN.md}`.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Reservations list | Store aside · Reservations | Все RSV; фильтр All / Reserve / Release / Reassign |
| Reservation detail | list row | Posted/draft header: place, destination, derived direction, lines with source |
| New Reservation dialog | list / order cell overflow | Create+post source→target |
| Regions list | Store aside · Regions (with Warehouses) | Catalog `REG-n` |
| Region detail | list row | Name, reserved stock, related RSV |
| Stock | existing | Reserved раскладывается по owner; Free без owner |
| Customer order | existing | Reserve/Release/Reassign через тот же dialog; claims по product |
| Shipment / Transfer / Production | existing | Owner-aware source pickers |

Legacy `?operation=release` maps to derived Release filter.

## Voice and Tone

| Do | Don't |
|---|---|
| `Reserve from Free to OMS-12` | `Operation: reserve` |
| `Source: Regional reserve · REG-3` | `Soft earmark` |
| `Not enough reserved for this order` | `Line COL-4 is short` |
| `Release always returns to Free` | `Restore previous region` |

## Component Patterns

| Component | Behavioral rules |
|---|---|
| Destination select | Выбор Free скрывает owner select. Order показывает open orders. Region показывает `store_region`. Смена destination пересчитывает caps строк, не стирает products. |
| Source select | Default Free. Order/Region показывает только owners с qty > 0 на выбранном месте и товаре. Повтор того же source+product блокируется. |
| Add line | Добавляет пустую строку того же product-picker; один product разрешён снова, если source другой. |
| Direction chip | Читается из from/to; пользователь его не задаёт. |
| Stock reserved | Под Free / Reserved / Shipped reserved раскрывается в order и region rows. |
| Ship source | Только order-owned rows текущего заказа. Region rows видны как недоступные с текстом `Reassign to this order first`. |

## State Patterns

| State | Treatment |
|---|---|
| No source qty | Source owner hidden or disabled; toast on post from RPC |
| Open qty exceeded | Quantity field caps; post still validated server-side |
| Posted reservation | Read-only; primary action is New reservation, not edit |
| Empty regions | Catalog empty state + Create region |
| Mixed-source draft | Valid; direction chip = Reserve if any line from Free and dest owner, else Reassign if all from owners |

Derived document direction for list filter: Reserve if every line from Free and dest is owner; Release if dest is Free; otherwise Reassign.

## Interaction Primitives

Существующие dialog + overflow menus. Нет drag-and-drop owner. Нет отдельной команды Reassign.

## Accessibility Floor

Selects имеют видимые labels (`Destination`, `Source`, `Product`, `Quantity`). Direction chip не единственный носитель смысла — колонки Destination и Source дублируют его. Фокус возвращается на trigger после закрытия dialog.

## Key Flows

**UJ-1. Anna reserves Free to an order.** Reservations → New → Destination Order OMS-12 → Place WH-1 → line Product P, Source Free, qty 4 → Post. Stock Reserved shows OMS-12 +4, Free −4.

**UJ-3. Anna converts a region pool.** Same dialog, Destination OMS-12, Source Regional reserve REG-3. After post, REG-3 reserved drops, OMS-12 reserved rises; no Free flicker.

**UJ-6. Anna tries to ship regional stock.** Shipment dialog lists only OMS-12 reserved at the warehouse. Regional qty is listed disabled with `Reassign to this order first`.
