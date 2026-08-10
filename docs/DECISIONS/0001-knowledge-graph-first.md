# ADR 0001: Knowledge graph first

- Status: accepted
- Date: 2026-08-09

## Context

LearnAnything aims to support journeys ranging from days to years across domains as different as quantum physics, philosophy, and Minecraft. A generated sequence of lessons cannot remain coherent, reusable, source-visible, or adaptable at that scope.

## Decision

The versioned global knowledge graph is the shared source of truth. Courses, journeys, stages, and learning horizons are computed views over the graph plus a goal and private learner state.

The core product must produce useful paths without a generative model. Optional AI may propose graph patches, explanations, or practice but never silently publishes shared truth.

## Consequences

- Research and review improve a reusable graph rather than regenerate courses per learner.
- Paths can adapt without losing historical learner evidence.
- Graph contracts, prerequisite semantics, mastery evidence, and provenance become foundational work.
- The UI must communicate both a large territory and a small next horizon.
- The project must resist storing learner-specific paths as independent curriculum truth.
