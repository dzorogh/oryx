<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles:
  - Principle 1 placeholder -> I. Container Minimization First
  - Principle 2 placeholder -> II. Physically Valid Placement Only
  - Principle 3 placeholder -> III. Floor-Only Rotation Policy
  - Principle 4 placeholder -> IV. Complete Inventory Placement
  - Principle 5 placeholder -> V. Deterministic and Explainable Packing
- Added sections:
  - Domain Constraints
  - Quality Gates and Validation
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (validated, no change required)
  - ✅ .specify/templates/spec-template.md (validated, no change required)
  - ✅ .specify/templates/tasks-template.md (validated, no change required)
  - ⚠ pending: .specify/templates/commands/*.md (directory absent, not applicable in current repo)
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): confirm original ratification date for this constitution.
-->
# Container Packing Visualization Constitution

## Core Principles

### I. Container Minimization First
The packing algorithm MUST prioritize using the minimum possible number of
containers. Secondary optimization criteria (such as free volume minimization
inside each used container) MUST only be applied after container count is
minimized.

Rationale: the main business objective is explicitly to use as few containers
as possible.

### II. Physically Valid Placement Only
Every placed item MUST satisfy all geometric and physical constraints:
- Item bounding box MUST be fully inside container bounds.
- Item intersections MUST be impossible.
- An item at height `z > 0` MUST have supporting contact area from the container
  floor or from top surfaces of already placed items directly beneath it.
- "Floating" placements with zero support are prohibited.

Rationale: generated layouts must be physically plausible and executable.

### III. Floor-Only Rotation Policy
Item orientation MUST preserve the item's vertical axis. Allowed rotations are
only around the vertical axis (yaw on container floor plane). Rotations that
place an item on its side or upside down are prohibited.

Rationale: domain requirement explicitly disallows side-turning and flipping.

### IV. Complete Inventory Placement
All item units from the input list MUST be represented in the final plan. The
system MUST NOT silently drop, hide, or ignore any item quantity. If all items
cannot be placed into the provided container types, the system MUST return an
explicit failure with an auditable list of unplaced units.

Rationale: result integrity requires one-to-one mapping between input and
output.

### V. Deterministic and Explainable Packing
For identical input data, the algorithm MUST produce deterministic output
ordering and placement (or deterministic tie-breaking). The output MUST include
machine-readable placement data sufficient for 3D rendering and verification.

Rationale: reproducibility is required for debugging, trust, and regression
testing.

## Domain Constraints

- Weight, mass distribution, and load balancing MUST NOT be modeled.
- Container wall penetration or out-of-bounds visualization MUST be impossible.
- Visualization MUST render one or more containers with interactive 3D orbiting
  so users can inspect placement of all items.
- Visualized positions and rotations MUST match algorithm output exactly.

## Quality Gates and Validation

Before acceptance, each implementation MUST pass:
- Geometry validation: no overlaps, no out-of-bounds placements.
- Support validation: every non-floor item has non-zero support beneath it.
- Completeness validation: placed item count equals total requested quantity.
- Objective validation: no alternative produced by the same algorithm config
  uses fewer containers for the same input.
- UI validation: user can rotate/inspect every used container and verify each
  item visually.

## Governance

- This constitution supersedes conflicting local implementation conventions for
  packing and visualization features.
- Any amendment MUST document: changed principle text, migration impact on
  existing specs/tasks, and version bump rationale.
- Versioning policy follows SemVer for governance:
  - MAJOR: removes or redefines a core principle incompatibly.
  - MINOR: adds a new principle/mandatory section or materially expands rules.
  - PATCH: clarifications with no normative behavior change.
- Compliance review is mandatory for every feature plan and spec generated via
  Speckit commands, including explicit checks against all five principles.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not recorded | **Last Amended**: 2026-03-20
