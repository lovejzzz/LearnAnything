# LearnAnything

LearnAnything is an open, local-first learning system that maps a field, locates a learner inside it, and builds a mastery path from where they are to where they want to go.

It is not a ten-lesson course generator. A path may last a week or several years. The complete map remains visible while the product presents only the learner's next useful horizon.

## Status

Foundation only. There is no application yet.

The repository currently defines:

- the product promise and non-goals;
- the global knowledge graph and learner model;
- a zero-LLM-required researcher architecture;
- strict package boundaries;
- initial machine-readable contracts;
- three deliberately different seed domains;
- the exact first vertical slice for the next implementation task.

## Product thesis

> LearnAnything maps what exists, discovers what you know, and guides you toward what you want to become using free knowledge and demonstrated mastery.

"Complete" means complete relative to a declared goal: prerequisite-closed, depth-labeled, source-visible, and ending in observable capabilities. It does not mean that the system contains every fact humanity knows.

## Start here

Read these files in order:

1. [AGENTS.md](AGENTS.md) — repository working agreements.
2. [docs/PRODUCT.md](docs/PRODUCT.md) — the product and its boundaries.
3. [docs/LEARNING_MODEL.md](docs/LEARNING_MODEL.md) — what knowledge, progress, and mastery mean.
4. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system and package boundaries.
5. [docs/RESEARCHER.md](docs/RESEARCHER.md) — how free knowledge becomes a reviewable graph.
6. [docs/MVP.md](docs/MVP.md) — the first product milestone.
7. [docs/BUILD_HANDOFF.md](docs/BUILD_HANDOFF.md) — the exact next Codex task.

## Foundation validation

Requires Node.js 22 or newer. No package installation is required yet.

```bash
npm test
```

The command validates JSON syntax, cross-references, prerequisite acyclicity, source-use declarations, and the presence of all three seed-domain fixtures.

## Repository direction

The initial implementation will use TypeScript, React, Vite, pnpm workspaces, Vitest, and Playwright. The graph and planner must remain pure TypeScript packages with no React or network dependency. The MVP must work with static repository data and browser-local learner state; it must not require an account, server, API key, or generative model.

## License status

The code and knowledge licenses have not yet been selected. Do not ingest or redistribute third-party content until that decision is recorded. Source metadata and links may be added only with an explicit content-use and license record as defined in [docs/RESEARCHER.md](docs/RESEARCHER.md).
