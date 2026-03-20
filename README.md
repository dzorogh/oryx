# Container Packing Visualization

Next.js приложение для визуализации упаковки фиксированного заказа в минимальное число контейнеров с физическими ограничениями.

## Run

```bash
npm install
npm run dev
```

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run check:deps
npm run check:docs
```

## Constraints

- Только Next.js.
- Поворот товаров только по полу (`yaw`).
- Без учета веса при оптимизации.
- Без пересечений, выхода за границы и "висящих" размещений.
- Используются только официальные источники документации.
