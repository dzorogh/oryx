---
name: Oryx owner reservations
status: final
sources:
  - docs/conventions/ui/list-page-toolbar.md
  - docs/conventions/ui/english-labels.md
  - docs/conventions/ui/full-width-page-content.md
  - ../../../specs/spec-order-and-region-reservations/SPEC.md
updated: 2026-09-19
colors:
  # Inherit Store/shadcn tokens. No new brand palette.
typography:
  # Inherit existing Store type scale (text-lg toolbar titles, text-sm tables).
rounded:
  # shadcn defaults.
spacing:
  # Existing logistics dialog and toolbar spacing.
components:
  toolbar-card:
    background: 'card'
    radius: 'lg'
  owner-chip:
    background: 'muted'
    foreground: 'foreground'
---

# Oryx owner reservations — Design Spine

## Brand & Style

Внутренний Store Logistics. Никакого нового бренда: существующий shadcn/Tailwind слой, белая toolbar-карточка на `bg-muted/30`, плотные таблицы. Новые подписи только на английском. Визуально Reservation остаётся тем же документом `RSV-n`; меняется содержание шапки и строк, не хроматика.

## Colors

Токены shadcn без override. Owner не красится в «риск»: order и region отличаются текстом и кодом (`OMS-12`, `REG-3`), не цветом статуса. Free — слово `Free`, не отдельный badge-цвет.

## Typography

Заголовок списка `text-lg` в toolbar Card. Таблицы `text-sm`. Коды моноширинные там, где уже принято для `WH-` / `OMS-` / `RSV-`.

## Layout & Spacing

Корень страницы без `max-w-*`. Список: breadcrumb снаружи, toolbar Card, таблица на всю ширину. Форма Reservation — существующий `LogisticsDialog`: шапка destination + место, затем повторяемые строки source.

## Elevation & Depth

Одна глубина модалки. Нет вложенного dialog для выбора source.

## Shapes

Стандартные shadcn radius. Строка формы — `rounded-md border p-3`, как сейчас.

## Components

| Component | Spec |
|---|---|
| Destination field | Один select: Free / Order / Region, затем второй select конкретного owner, скрытый если Free |
| Source field | На строке: Free по умолчанию; Order или Region открывает owner select с доступным qty |
| Direction chip | Вычисляемый `Reserve` / `Release` / `Reassign` в списке и карточке, не редактируется |
| Owner chip | Код + короткое имя; в остатках reserved раскладывается на owner rows |
| Region catalog | Тот же list-page pattern, что warehouses |

## Do's and Don'ts

- Do: показывать доступный qty рядом с каждым source owner.
- Do: позволять две строки одного товара с разными source.
- Don't: спрашивать operation reserve/release отдельным полем.
- Don't: вводить цветовую легенду «регион мягче заказа».
- Don't: прятать region reserve внутри колонки Free.
