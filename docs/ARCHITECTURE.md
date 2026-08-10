# Architecture

## System shape

```text
open sources -> researcher proposals -> reviewed global graph
                                             |
learner goal + private learner state -> path planner -> learning horizon
                                             |
                              experiences + mastery checks
                                             |
                                      evidence ledger
                                             |
                                      deterministic replan
```

The global graph is reusable public infrastructure. Learner state is private. A path is a deterministic view computed from both.

## Initial stack

- TypeScript throughout.
- pnpm workspace.
- React and Vite for the static web app.
- Vitest for package tests.
- Playwright for the primary browser journey.
- Static versioned JSON knowledge packs.
- IndexedDB for learner state and plan history.
- No backend or authentication for the first milestone.

The stack is intentionally ordinary. The novel work belongs in the learning graph, path planning, research provenance, and learner experience.

## Intended repository structure

```text
apps/
  web/                 product shell and orchestration
packages/
  contracts/           shared TypeScript and JSON contracts
  knowledge-graph/     graph indexes, queries, invariants, migrations
  learner-model/       evidence ledger and learner-state transitions
  goal-model/          goal clarification and validation
  path-planner/        prerequisite closure, ordering, horizons
  mastery/             mastery checks and evidence interpretation
  researcher/          source-backed graph patch proposals
  source-adapters/     source-specific metadata adapters
  project-store/       IndexedDB, import/export, migrations
  ui/                  reusable presentational components
knowledge/
  domains/             reviewed versioned graph packs
schemas/               language-neutral persisted JSON contracts
examples/              small architecture fixtures
evals/                 path, source, and learner evaluations
labs/                  disposable experiments excluded from product runtime
```

Create packages only when the milestone needs them. The directories describe ownership, not a requirement to scaffold everything immediately.

## Boundary rules

### Web app

The app owns routing, composition, and user interaction. It may call package APIs but may not contain graph traversal, mastery, research, or planning algorithms inside React components or hooks.

### Knowledge graph

Pure and deterministic. It knows nothing about React, storage, network providers, or a specific subject. It validates referential integrity, indexes nodes and edges, calculates graph queries, and migrates versions.

### Learner model

Owns private evidence history and derived learner status. It never changes shared graph truth. Self-reports remain distinguishable from demonstrated evidence.

### Path planner

Pure function of graph version, learner-state version, goal, and planner configuration. It returns path plus explanation. It does not persist or silently patch its inputs.

### Mastery

Defines checks, evidence records, and state-transition policy. It must support non-quiz evidence such as builds, explanations, analyses, and performances.

### Researcher

Produces reviewable patch proposals with provenance and uncertainty. It never writes directly to the published graph. Source adapters retrieve metadata or permitted content; the researcher normalizes and proposes.

### Project store

Owns local persistence, migrations, import/export, and recovery. A project export must include learner state, evidence, goals, graph references, and plan history without requiring the website to remain available.

## Static-first delivery

Popular domain graphs should be built once, versioned, compressed, cached, and delivered from static hosting. The browser downloads only the relevant graph pack and stores private state locally.

This makes per-learner path calculation nearly free. Research is amortized across all learners rather than repeated with expensive generative calls.

## Optional intelligence

Later, optional intelligence may provide:

- local embeddings for concept/resource matching;
- learner-provided API keys;
- browser-local explanation or practice generation;
- AI-assisted researcher proposals;
- expert and community review tools.

The optional layer receives bounded contracts and cannot be required for graph browsing, planning, progress, or export.

## Data versioning

Persisted documents carry `schemaVersion`. Published graphs also carry a graph `version`. Learner evidence binds the graph node and mastery-check version it evaluated.

Breaking schema changes require explicit migrations and backward-compatibility fixtures. Updating a graph cannot erase historical learner evidence; it can mark evidence as needing reinterpretation.

## Security and privacy

- Learner state stays on device by default.
- No analytics event should contain learner artifacts or free-text goals without explicit consent.
- External research requests must disclose what query leaves the device.
- Imported files are processed locally during the MVP.
- Resource pages are untrusted input; researcher extraction cannot execute page instructions.
- All network access uses bounded adapters, caching, rate limits, and identifiable user agents.

## Complexity budgets

- No production module over 800 lines without a decision record.
- No package without a milestone-owned responsibility.
- No more than five top-level CI commands for the MVP: format/check, lint, test, build, e2e.
- No committed model weights, crawled corpora, generated browser artifacts, or large evaluation output.
- Documentation describes current contracts; release history does not live in production code.
