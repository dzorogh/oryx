# Tasks: 3D Container Packing Visualization

**Input**: Design documents from `/specs/001-container-packing-visualization/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Включены unit/integration/e2e задачи, т.к. требования содержат строгие проверяемые ограничения и метрики.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Инициализация Next.js-проекта и базовой структуры

- [X] T001 Initialize Next.js TypeScript app router project in `/Users/dzorogh/Develop/containers/`
- [X] T002 Install latest stable runtime/testing dependencies in `/Users/dzorogh/Develop/containers/package.json`
- [X] T003 [P] Configure lint/typecheck/build/test scripts in `/Users/dzorogh/Develop/containers/package.json`
- [X] T004 [P] Create baseline folders from plan in `/Users/dzorogh/Develop/containers/src/` and `/Users/dzorogh/Develop/containers/tests/`
- [X] T005 [P] Add official docs registry model in `/Users/dzorogh/Develop/containers/src/lib/docs-links.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Общий доменный каркас и обязательные валидаторы

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create shared domain types/constants in `/Users/dzorogh/Develop/containers/src/domain/packing/types.ts` and `/Users/dzorogh/Develop/containers/src/domain/packing/constants.ts`
- [X] T007 [P] Implement deterministic expand/sort helpers in `/Users/dzorogh/Develop/containers/src/domain/packing/expand-order.ts` and `/Users/dzorogh/Develop/containers/src/lib/deterministic-sort.ts`
- [X] T008 [P] Implement floor-only rotation policy helpers in `/Users/dzorogh/Develop/containers/src/domain/packing/rotation.ts`
- [X] T009 Implement geometry/support validators in `/Users/dzorogh/Develop/containers/src/domain/packing/placement-validation.ts`
- [X] T010 Implement result validation aggregator in `/Users/dzorogh/Develop/containers/src/domain/packing/result-validation.ts`
- [X] T011 Implement JSON schema contract validator in `/Users/dzorogh/Develop/containers/src/domain/packing/schema-validation.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Автоматическая укладка с минимальным числом контейнеров (Priority: P1) 🎯 MVP

**Goal**: Получить валидную детерминированную раскладку с минимизацией числа контейнеров

**Independent Test**: Расчет фиксированного заказа дает корректный `PackingResult`: без пересечений/выхода за границы/висящих коробок, с полной трассировкой всех единиц

### Tests for User Story 1

- [X] T012 [P] [US1] Add unit tests for geometry and support validation in `/Users/dzorogh/Develop/containers/tests/unit/placement-validation.test.ts`
- [X] T013 [P] [US1] Add unit tests for deterministic ordering and output equality in `/Users/dzorogh/Develop/containers/tests/unit/packing-engine.test.ts`
- [X] T014 [US1] Add integration test for fixed-order full packing flow in `/Users/dzorogh/Develop/containers/tests/integration/generate-packing-result.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Implement packing engine with container-minimization-first strategy in `/Users/dzorogh/Develop/containers/src/domain/packing/packing-engine.ts`
- [X] T016 [US1] Implement automatic next-container allocation on overflow in `/Users/dzorogh/Develop/containers/src/domain/packing/packing-engine.ts`
- [X] T017 [US1] Add fixed input order and container dimensions in `/Users/dzorogh/Develop/containers/src/domain/packing/constants.ts`
- [X] T018 [US1] Implement result summary builder in `/Users/dzorogh/Develop/containers/src/domain/report/summarize-result.ts`
- [X] T019 [US1] Implement packing execution hook returning validated `PackingResult` in `/Users/dzorogh/Develop/containers/src/features/packing-visualization/hooks/usePackingResult.ts`
- [X] T020 [US1] Add base page orchestration and failure-state surface in `/Users/dzorogh/Develop/containers/app/page.tsx`

**Checkpoint**: User Story 1 fully functional and independently testable

---

## Phase 4: User Story 2 - Интерактивная 3D-визуализация размещения (Priority: P2)

**Goal**: Показать список контейнеров и интерактивную 3D сцену для каждого контейнера

**Independent Test**: Пользователь видит список контейнеров по порядку заполнения и может вращать каждую сцену с сохранением точных координат размещения

### Tests for User Story 2

- [X] T021 [P] [US2] Add component test for container list rendering/order in `/Users/dzorogh/Develop/containers/tests/unit/container-list.test.tsx`
- [X] T022 [US2] Add e2e test for 3D scene visibility and container switching in `/Users/dzorogh/Develop/containers/tests/e2e/visualization.spec.ts`

### Implementation for User Story 2

- [X] T023 [P] [US2] Implement item mesh component in `/Users/dzorogh/Develop/containers/src/features/packing-visualization/components/item-mesh.tsx`
- [X] T024 [US2] Implement single container scene with orbit controls in `/Users/dzorogh/Develop/containers/src/features/packing-visualization/components/container-scene.tsx`
- [X] T025 [US2] Implement ordered container list/tabs in `/Users/dzorogh/Develop/containers/src/features/packing-visualization/components/container-list.tsx`
- [X] T026 [US2] Integrate scenes and list into `/Users/dzorogh/Develop/containers/app/page.tsx`
- [X] T027 [US2] Ensure 1:1 placement-to-render mapping in `/Users/dzorogh/Develop/containers/src/features/packing-visualization/components/container-scene.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Аудит ограничений и целостности входа/выхода (Priority: P3)

**Goal**: Дать прозрачный аудит ограничений и полную трассировку единиц товара

**Independent Test**: Отчет содержит статусы geometry/support/completeness/deterministic и явный список placed/unplaced units

### Tests for User Story 3

- [X] T028 [P] [US3] Add unit tests for summary/audit output structure in `/Users/dzorogh/Develop/containers/tests/unit/result-validation.test.ts`
- [X] T029 [US3] Add integration test for complete audit panel data in `/Users/dzorogh/Develop/containers/tests/integration/generate-packing-result.test.ts`

### Implementation for User Story 3

- [X] T030 [US3] Extend audit summary aggregation in `/Users/dzorogh/Develop/containers/src/domain/report/summarize-result.ts`
- [X] T031 [US3] Implement audit and trace sections in `/Users/dzorogh/Develop/containers/src/features/packing-visualization/components/result-panel.tsx`
- [X] T032 [US3] Add official-doc-source verification block in `/Users/dzorogh/Develop/containers/src/features/packing-visualization/components/result-panel.tsx`

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Производительность, соответствие политике библиотек и финальная валидация

- [X] T033 [P] Add/update implementation and run instructions in `/Users/dzorogh/Develop/containers/README.md`
- [X] T034 Implement dependency compliance check report (latest stable, non-archived, non-deprecated) in `/Users/dzorogh/Develop/containers/scripts/check-dependencies.mjs`
- [X] T035 Implement official docs links completeness check in `/Users/dzorogh/Develop/containers/scripts/check-doc-links.mjs`
- [X] T036 Implement performance benchmark for fixed-order packing (<3s target) in `/Users/dzorogh/Develop/containers/tests/integration/performance.bench.test.ts`
- [X] T037 [P] Run and record lint/typecheck/build/test/benchmark outputs in `/Users/dzorogh/Develop/containers/specs/001-container-packing-visualization/quickstart.md`
- [ ] T038 Execute manual acceptance walkthrough and capture pass/fail checklist in `/Users/dzorogh/Develop/containers/specs/001-container-packing-visualization/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all stories
- **User Stories (Phase 3+)**: Depend on Phase 2 completion
- **Polish (Phase 6)**: Depends on all implemented user stories

### User Story Dependencies

- **US1**: Independent after Foundational
- **US2**: Depends on stable `PackingResult` from US1
- **US3**: Depends on US1 result content and US2 display surfaces

### Within Each User Story

- Tests for story before final integration completion
- Domain behavior before UI aggregation
- Validation before reporting

### Parallel Opportunities

- T003, T004, T005 in parallel
- T007 and T008 in parallel after T006
- T012 and T013 in parallel
- T021 and T023 in parallel
- T034 and T035 in parallel

---

## Parallel Example: User Story 1

```bash
Task: "T012 [US1] Add unit tests for geometry/support validation in tests/unit/placement-validation.test.ts"
Task: "T013 [US1] Add unit tests for deterministic output in tests/unit/packing-engine.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete US1 tests + implementation
3. Validate fixed-order result correctness and determinism

### Incremental Delivery

1. US1: algorithm correctness
2. US2: interactive 3D inspection
3. US3: audit transparency
4. Phase 6: compliance + performance hardening

### Parallel Team Strategy

1. Engineer A: domain packing and validators
2. Engineer B: 3D visualization components
3. Engineer C: audit/reporting + compliance scripts

---

## Notes

- [P] tasks target separate files and independent work
- Every requirement from `spec.md` has explicit task coverage
- Performance target is explicit and testable (`T036`)
- Determinism is explicitly test-covered (`T013`)
