---
title: 'Универсальное бронирование по заказу и региону'
type: 'refactor'
created: '2026-09-19'
status: 'in_progress'
route: 'dispatch'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/_bmad-output/specs/spec-order-and-region-reservations/SPEC.md'
---

## Intent

**Problem:** Reservation и ledger привязаны к заказу и строке заказа; региональный резерв и атомарный перенос между владельцами невозможны.

**Approach:** Generic `owner_type` + `owner_id` во всём складском учёте. Reservation = source→target. Free = NULL owner. Широкая миграция к чистой модели.

## Boundaries & Constraints

**Always:** destination in header, source on line; CHECK+trigger; unique product per order; shipment order-only; posted RSV immutable; Oryx demo Supabase only.

**Never:** operation column; customer_order_line_id claims; soft earmark; owner registry table; Capacity/YNAPB/cloud Supabase.
