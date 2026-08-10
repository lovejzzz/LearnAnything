# Build handoff for the next Codex task

## Read first

Read `AGENTS.md`, then `PRODUCT.md`, `LEARNING_MODEL.md`, `ARCHITECTURE.md`, and `MVP.md` in this directory. Run `npm test` before making changes.

## Objective

Implement the first offline vertical slice: select a seed domain, select a target capability and prior capabilities, compute a prerequisite-closed path, display the whole map plus the next-seven-day horizon, record one mastery result, and deterministically replan.

Do not implement the automated researcher in this task.

## Implementation sequence

1. Convert the root into a pnpm workspace without changing persisted schema semantics.
2. Create `packages/contracts` with TypeScript types corresponding to the JSON schemas.
3. Create `packages/knowledge-graph` with parsing, indexes, invariant validation, prerequisite closure, and cycle detection.
4. Create `packages/learner-model` with evidence records and derived capability status.
5. Create `packages/path-planner` as a pure deterministic function returning a path, inclusion explanations, and a time-bounded horizon.
6. Create `packages/project-store` with a browser storage interface and an in-memory test adapter; add IndexedDB only at the app boundary.
7. Create `apps/web` with React, Vite, and a calm accessible interface.
8. Add Vitest package tests and one Playwright journey parameterized across the three fixtures.

## Required planner behavior

Input:

- one validated graph;
- target capability IDs;
- learner state;
- hours available per week;
- current date and planner version supplied explicitly.

Output:

- ordered remaining capabilities;
- stage groupings;
- inclusion reason for every capability;
- attached resources and mastery checks;
- next-horizon items within the time budget;
- blocked or unresolved targets;
- stable digest or serializable identity for deterministic tests.

The planner must not read the clock, random source, browser storage, or network directly.

## UI shape

Use three connected surfaces rather than a dashboard:

1. **Map:** the relevant territory, current frontier, target, branches, and prerequisites.
2. **Journey:** ordered stages and why each exists.
3. **Now:** the next small set of actions, resources, and mastery checks.

The learner should always be able to answer: Where am I? Where am I going? Why is this next? What would count as progress?

Avoid chat as the main interface. Avoid a wall of cards, metrics, or configuration.

## Tests that must exist

- transitive prerequisite closure;
- deterministic topological ordering;
- cycle rejection;
- alternative relationships do not become false prerequisites;
- already-demonstrated capability removal;
- stale or weak evidence does not count as independent mastery;
- horizon respects available time;
- no resource-open event upgrades mastery;
- export/import round trip;
- identical inputs produce identical path output;
- quantum, philosophy, and Redstone fixtures all pass through the same code.

## Stop conditions

Stop and document the decision instead of expanding scope if implementation appears to require:

- a backend;
- an LLM or embedding API;
- domain-specific branches in the core planner;
- changing the meaning of mastery to completion;
- copying external learning content;
- a fourth domain;
- a new package not owned by the vertical slice.

## Deliverable

A locally runnable web app plus tests demonstrating the complete loop for the compact fixtures. Update this file with the next unresolved product questions; do not turn it into release history.
