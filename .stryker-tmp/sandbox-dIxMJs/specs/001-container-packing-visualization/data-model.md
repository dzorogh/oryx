# Data Model: 3D Container Packing Visualization

## 1) OrderItemType
- **Description**: Тип товара из входного заказа.
- **Fields**:
  - `id: number`
  - `name: string`
  - `width: number` (mm, > 0)
  - `length: number` (mm, > 0)
  - `height: number` (mm, > 0)
  - `weight: number` (kg, > 0, informational only)
  - `quantity: number` (integer, > 0)
- **Rules**:
  - `weight` не участвует в ограничениях и оптимизации.

## 2) OrderItemUnit
- **Description**: Конкретная единица товара после разворота `quantity`.
- **Fields**:
  - `unitId: string` (unique, e.g. `41-07`)
  - `itemTypeId: number` (FK -> OrderItemType.id)
  - `dimensions: { width: number; length: number; height: number }`
- **Rules**:
  - Количество `OrderItemUnit` строго равно сумме `quantity`.

## 3) ContainerType
- **Description**: Тип контейнера.
- **Fields**:
  - `width: number` (= 12032)
  - `length: number` (= 2352)
  - `height: number` (= 2698)

## 4) ContainerInstance
- **Description**: Использованный контейнер в результате.
- **Fields**:
  - `containerIndex: number` (0..N-1, order of fill)
  - `placements: Placement[]`

## 5) Placement
- **Description**: Размещение одной единицы товара.
- **Fields**:
  - `containerIndex: number`
  - `itemUnitId: string`
  - `itemTypeId: number`
  - `position: { x: number; y: number; z: number }` (mm, bottom-left-near corner)
  - `rotationYaw: 0 | 90`
  - `size: { width: number; length: number; height: number }` (effective after yaw)
- **Validation Rules**:
  - In-bounds: `x,y,z >= 0` and `x+width <= cw`, `y+length <= cl`, `z+height <= ch`.
  - Non-overlap: пересечение объема с любым другим placement в том же контейнере запрещено.
  - Support: если `z > 0`, требуется ненулевая поддерживающая площадь снизу.

## 6) PackingValidation
- **Description**: Результаты обязательных проверок.
- **Fields**:
  - `geometryValid: boolean`
  - `supportValid: boolean`
  - `completenessValid: boolean`
  - `deterministic: boolean`
  - `violations: string[]`

## 7) PackingResult
- **Description**: Итог работы алгоритма и вход для UI.
- **Fields**:
  - `usedContainerCount: number`
  - `containers: ContainerInstance[]`
  - `unplacedItemUnitIds: string[]`
  - `validation: PackingValidation`
  - `summary: { totalUnits: number; placedUnits: number; unplacedUnits: number }`
- **State Semantics**:
  - **Success**: `unplacedItemUnitIds.length === 0` и все validation-флаги `true`.
  - **Failure**: есть неразмещенные единицы или validation-флаг `false`.
