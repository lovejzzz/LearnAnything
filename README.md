# LearnAnything

LearnAnything is an open, local-first learning system that maps a field, locates a learner inside it, and builds a mastery path from where they are to where they want to go.

Public site: [learn-anything.skylab.chatgpt.site](https://learn-anything.skylab.chatgpt.site/)

It is not a ten-lesson course generator. A path may last a week or several years. The complete map remains visible while the product presents only the learner's next useful horizon.

## Status

The first offline vertical slice is runnable. It includes:

- one deterministic graph and planner shared by the quantum physics, philosophy, and Minecraft Redstone fixtures;
- an evidence ledger with freshness and confidence policy;
- a seven-day learning horizon with resources and mastery checks;
- a React interface organized as Map, Journey, and Now;
- local IndexedDB persistence with project export and import;
- package tests and a parameterized Playwright journey across all three domains.

The automated researcher remains a documented future boundary and is not implemented in this slice.

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

## Run locally

Requires Node.js 22 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

After the first dependency installation, the app and its compact knowledge fixtures run without network access, a backend, an account, an API key, or an LLM.

## Validate

```bash
pnpm validate
pnpm e2e
```

`validate` checks TypeScript, the foundation data, package behavior, and the production build. `e2e` runs the complete browser loop for all three domains plus export/import recovery.

## Repository shape

The implementation uses TypeScript, React, Vite, pnpm workspaces, Vitest, and Playwright. The graph and planner are pure TypeScript packages with no React, storage, clock, random, or network dependency. The app composes those packages with static repository data and browser-local learner state.

## Licenses

Software source code and configuration are available under the [MIT License](LICENSE). Repository-authored documentation, schemas, example knowledge graphs, and visual assets are available under [CC BY 4.0](LICENSE-DATA.md). Linked third-party resources retain their original rights and are never relicensed by LearnAnything.
