# Package ownership

This directory records intended ownership boundaries. Packages should be created only when the current milestone needs them.

| Package | Owns | Must not own |
| --- | --- | --- |
| `contracts` | Persisted TypeScript and JSON contracts | Business behavior |
| `knowledge-graph` | Graph validation, indexes, queries, migrations | React, storage, network |
| `learner-model` | Evidence and capability-state transitions | Shared graph mutation |
| `goal-model` | Goal structure and clarification | Path computation |
| `path-planner` | Deterministic routes and horizons | Persistence or UI |
| `mastery` | Checks, evidence interpretation, reassessment | Resource discovery |
| `researcher` | Reviewable graph patch proposals | Direct publication |
| `source-adapters` | Bounded external-source metadata access | Learning-path decisions |
| `project-store` | Local persistence, migration, import/export | Curriculum logic |
| `ui` | Reusable presentational components | Domain algorithms |

See `docs/ARCHITECTURE.md` and `docs/BUILD_HANDOFF.md` before scaffolding packages.
