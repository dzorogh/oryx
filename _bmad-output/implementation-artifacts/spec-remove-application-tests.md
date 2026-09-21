---
title: 'Удаление автотестов и тестовой инфраструктуры'
type: 'chore'
created: '2026-09-21'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'fa37590649fe5f7251a4c8a35736f2de56cdc7eb'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Oryx — исследовательский прототип, но репозиторий содержит крупный набор unit-, e2e-, coverage- и mutation-тестов, их зависимости и обязательные команды проверки. Они замедляют установку, typecheck и каждую итерацию разработки, хотя продуктовые решения быстро меняются.

**Approach:** Полностью удалить автотесты приложения и их инфраструктуру, убрать тестовые зависимости и обязательность тестов из активной документации. Оставить быстрые статические проверки, production-сборку и ручную браузерную проверку интерфейса.

## Boundaries & Constraints

**Always:**
- Удалить все прикладные автотесты в `tests/`, конфигурации Vitest, Playwright и Stryker, test-only npm-скрипты и зависимости.
- Обновить lockfile через npm, не редактировать его вручную.
- Сохранить рабочими `lint`, `typecheck`, `build`, `check:deps`, `check:docs` и `check:static-images`.
- Сохранить уже существующие незакоммиченные продуктовые изменения; удаление изменённых файлов внутри `tests/` явно одобрено пользователем.
- Убрать из активных инструкций требование писать или запускать автотесты.

**Never:**
- Не удалять BMAD-спеки, внутренние проверки BMAD-скиллов, страницу `/learning/tests`, сиды или статические сканеры только из-за слова `test`.
- Не добавлять заменяющий test runner, CI или формальную QA-инфраструктуру.
- Не удалять полезный benchmark только потому, что его текущая реализация вызывает Vitest: либо отвязать его от тестов, либо удалить сломанный скрипт вместе с его командами.

</frozen-after-approval>

## Code Map

- `tests/` — 57 unit/integration тестов, один e2e-тест и test-only fixtures; удалить целиком.
- `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `stryker.config.mjs` — конфигурации удаляемых runners; удалить.
- `package.json`, `package-lock.json` — удалить `test*`-скрипты и зависимости Vitest, Testing Library, jsdom, Playwright и Stryker; синхронизировать lockfile.
- `scripts/bench-packing.mjs` — сейчас измеряет запуск одного Vitest-теста; отвязать benchmark от удалённой инфраструктуры или удалить его команды.
- `src/lib/docs-links.ts`, `scripts/check-doc-links.mjs` — удалить обязательные ссылки Vitest/Playwright, сохранив `check:docs`.
- `AGENTS.md`, `README.md` — заменить обязательный test gate на актуальный набор статических проверок, сборку и ручную UI-проверку.
- `docs/conventions/backend/supabase.md`, `docs/features/store-pim-catalog.md`, `docs/features/comments-module.md` — удалить активные указания запускать автотесты или поддерживать тестовые сценарии.
- `.gitignore`, `eslint.config.mjs`, `eslint.english-ui.config.mjs`, `scripts/lib/english-ui-scan.mjs`, `tsconfig.json` — удалить только устаревшие test-runner артефакты, если после удаления файлов они больше не нужны.

## Tasks & Acceptance

**Execution:**
- [x] `tests/`, runner configs — удалить все прикладные автотесты и конфигурации.
- [x] `package.json`, `package-lock.json` — удалить команды и пакеты тестовой инфраструктуры штатной npm-операцией.
- [x] `scripts/`, `src/lib/docs-links.ts` — устранить зависимости оставшихся команд от Vitest/Playwright и проверить служебные скрипты.
- [x] `AGENTS.md`, `README.md`, релевантные `docs/` — зафиксировать prototype-first политику без обязательных автотестов.
- [x] Конфиги и ignore-файлы — удалить остаточные ссылки на coverage, Playwright, Stryker и test/spec-файлы там, где они стали мёртвыми.

**Acceptance Criteria:**
- Given чистая установка зависимостей, when выполняется `npm install`, then ни Vitest, Testing Library, jsdom, Playwright, ни Stryker не устанавливаются как прямые зависимости проекта.
- Given репозиторий после изменения, when ищут прикладные `*.test.*`, `*.spec.*`, test fixtures и runner configs, then таких артефактов нет вне внутренней BMAD-инфраструктуры и исторических planning-материалов.
- Given стандартный handoff прототипа, when разработчик читает активные инструкции, then обязательны lint, typecheck, build, static-image и ручная UI-проверка, но не автотесты.
- Given оставшиеся npm-команды, when запускаются проверки документации и зависимостей, then они не требуют удалённых test runners.

## Implementation Notes

- Удалены `tests/`, конфигурации Vitest/Playwright/Stryker и отслеживаемый `.stryker-tmp`.
- Удалены test-only npm-команды, прямые зависимости тестовых runners и неработающий benchmark, который запускал Vitest вместо самостоятельного измерения.
- Активные инструкции и документация переведены на prototype-first baseline: статические проверки, production build и ручная браузерная проверка UI.
- Удалены мёртвые ссылки на test/coverage/runner-артефакты из TypeScript, ESLint, Docker и ignore-конфигураций.

## Spec Change Log

## Review Triage Log

- `blind-hunter-1` — `medium`, `defer`: изменения в `AGENTS.md` находятся внутри управляемого блока и могут быть перезаписаны refresh; исправление относится к generator/agent-context.
- `blind-hunter-2` — `medium`, `defer`: обязательный baseline сейчас не зелёный из-за 11 существовавших до chore lint-ошибок и 23 устаревших продуктовых зависимостей.
- `blind-hunter-3` — `low`, `defer`: неизменённая строка Comments про успешный `check:deps` противоречит текущему состоянию зависимостей; это предшествующий документационный дефект.
- `blind-hunter-4` — `low`, `patch`: пробел проверки закрыт чистым `npm ci --ignore-scripts` во временном каталоге; прямых test-only зависимостей нет.
- `blind-hunter-5` — `false`: Playwright остаётся только optional peer-метаданными Next.js; корень manifest/lockfile и `npm ls --depth=0` не содержат его как прямую зависимость, как требует AC.
- `blind-hunter-6` — `false`: brainstorming memlog не staged и не является частью реализации; workflow-diff включил все чужие untracked-файлы только для обзора.
- `blind-hunter-7` — `false`: `spec-stock-adjustments.md` не staged и не является частью реализации; файл сохранён как параллельная пользовательская работа.
- `blind-hunter-8` — `medium`, `defer`: параллельная draft-спека Stock Adjustments действительно требует удалённые test-файл и npm-команду, но не создана этим chore.
- `blind-hunter-9` — `false`: поведение Comments подробно остаётся в основном документе; удалён только активный раздел автоматизированных test-сценариев, как требует intent.
- `blind-hunter-10` — `false`: ручной checklist относится к изменяемым режимам каталога; URL Stock оставлен как соседний маршрут и UI в этом chore не менялся.
- `blind-hunter-11` — `medium`, `defer`: удаление Thanks mapping test убирает регрессионную защиту маппинга; это осознанное следствие утверждённой prototype-first политики.
- `blind-hunter-12` — `low`, `reject`: scanner запускается на реальном корпусе и не менялся; self-test добавил бы заменяющую тестовую инфраструктуру ради маловероятной будущей поломки.
- `blind-hunter-13` — `medium`, `defer`: после удаления menu e2e нет автоматизированного navigation smoke; это осознанное следствие утверждённой политики, UI в chore не менялся.
- `blind-hunter-14` — `medium`, `defer`: у перечисленных packing/logistics/pricelist потоков больше нет документированной регрессионной проверки; intent явно принимает этот риск для прототипа.
- `edge-case-hunter-1` — `medium`, `defer`: активная draft-спека Stock Adjustments ссылается на отсутствующие test-файл и npm-команду; это параллельный untracked-файл вне текущей реализации.
- `verification-gap-1` — `medium`, `defer`: изменение `orderOverride` теперь может пройти статические проверки; reviewer подтвердил удаление единственной исполняемой регрессии.
- `verification-gap-2` — `medium`, `defer`: derivation `reservationDirection` теперь может регрессировать без исполняемой проверки; reviewer подтвердил потребителя и демонстрацию.
- `verification-gap-3` — `low`, `reject`: контракт static-image scanner больше не self-tested, но production scanner не менялся и его команда успешно проверила реальный репозиторий; replacement self-test противоречит выбранной политике.
- `verification-gap-other-1` — `medium`, `defer`: draft-спека Stock Adjustments требует удалённый `npm run test`; проблема подтверждена, но создана параллельно и не staged.
- `review-2-blind-1` — `false`, carried: untracked brainstorming memlog и `spec-stock-adjustments.md` не входят в коммит этой реализации; unified diff включает их только для обязательного обзора текущего дерева.
- `review-2-blind-2` — `medium`, carried defer: параллельная draft-спека Stock Adjustments ссылается на удалённые test-файл и npm-команду; это подтверждённая отдельная работа, уже записанная в deferred-work.
- `review-2-blind-3` — `medium`, carried defer: prototype-first правка находится внутри managed-блока `AGENTS.md` и требует устойчивого изменения генератора; уже отложено отдельно.
- `review-2-blind-4` — `medium`, carried defer: `lint` и `check:deps` остаются красными из-за существовавших до chore продуктовых ошибок и устаревших зависимостей; восстановление baseline уже отложено.
- `review-2-blind-5` — `false`: задачи удаления выполнены, а оставшиеся команды доступны и не зависят от удалённых runners; зелёный baseline не заявлен как результат этого chore и его прежние сбои задокументированы.
- `review-2-blind-6` — `low`, carried defer: утверждение Comments об успешном `check:deps` предшествует chore и противоречит текущему baseline; исправление уже отложено.
- `review-2-blind-7` — `false`, carried: основной документ Comments сохраняет описание поведения; удалён только обязательный список автоматизированных сценариев, а ручная проверка явно добавлена.
- `review-2-blind-8` — `medium`, carried defer: удаление menu e2e оставляет навигацию без автоматического smoke; это осознанное следствие политики и риск уже отложен.
- `review-2-blind-9` — `false`: удалённый `bench-packing.mjs` не измерял packing engine, а только время запуска Vitest-теста; frozen intent прямо разрешает удалить этот сломанный псевдобенчмарк и его команды.
- `review-2-blind-10` — `false`: после удаления first-party runners ни одна команда проекта не создаёт coverage, Playwright или Stryker outputs; сохранение защитных ignores поддерживало бы мёртвую тестовую инфраструктуру.
- `review-2-blind-11` — `false`, carried: Playwright остаётся только optional peer metadata Next.js; чистая установка и корневой manifest не содержат его как прямую зависимость, что соответствует acceptance criterion.
- `review-2-blind-12` — `false`: повторный `npm install --package-lock-only --ignore-scripts` не изменил lockfile; наблюдаемый churn — воспроизводимый результат пересчёта графа после удаления test-only пакетов.
- `review-2-blind-13` — `false`, carried: Store PIM документ содержит специфичный локальный checklist, а канонический полный baseline остаётся в README/AGENTS; Stock указан как соседний маршрут, UI которого chore не менял.
- `review-2-edge-1` — `medium`, carried defer: draft-спека Stock Adjustments требует отсутствующие test-файл и `npm run test`; параллельный untracked-файл уже вынесен в deferred-work.
- `review-2-verification-1` — `medium`, carried defer: packing `orderOverride` теряет исполняемую регрессионную защиту; это подтверждённый и уже отложенный риск принятой prototype-first политики.
- `review-2-verification-2` — `medium`, carried defer: `reservationDirection` теряет исполняемую проверку классификации; это подтверждённый и уже отложенный риск принятой prototype-first политики.

## Verification

**Commands:**
- `npm install --package-lock-only` — lockfile успешно синхронизирован.
- Чистый `npm ci --ignore-scripts` во временном каталоге — успешно, прямых test-only зависимостей нет.
- `npm run lint` — команда выполняется, но baseline содержит 11 ошибок React hooks в неизменённых продуктовых файлах Tracker, Comments и Logistics (плюс 2 предупреждения).
- `npm run typecheck` — успешно.
- `npm run build` — production-сборка успешна.
- `npm run check:deps` — команда выполняется, но baseline содержит 23 устаревшие прямые зависимости вне тестовой инфраструктуры.
- `npm run check:docs` — успешно без Vitest/Playwright.
- `npm run check:static-images` — успешно.
- Аудит `package.json` и корневого lockfile — прямых test-only зависимостей и test/benchmark-команд нет.
- `rg` и поиск файлов по активному коду и документации — исполняемых прикладных тестов, test-only импортов, runner configs и обязательных test-команд нет; сохранены только внутренние проверки BMAD, исторические planning-материалы и `/learning/tests`.
