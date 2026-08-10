# LearnAnything

LearnAnything is an open, local-first learning system that maps a field, locates a learner inside it, and builds a mastery path from where they are to where they want to go.

Public site: [learn-anything.skylab.chatgpt.site](https://learn-anything.skylab.chatgpt.site/)

It is not a ten-lesson course generator. A path may last a week or several years. The complete map remains visible while the product presents only the learner's next useful horizon.

## Status

The first offline vertical slice is runnable. It includes:

- a free-form intake for what the learner wants to learn, where they are now, and what they want to become capable of doing;
- deterministic matching into reviewed graph packs with an explicit stop for unmapped topics;
- suggested placement questions that never become evidence until the learner confirms or demonstrates them;
- one deterministic graph and planner shared by the quantum physics, philosophy, and Minecraft Redstone fixtures;
- an evidence ledger with freshness and confidence policy;
- a seven-day learning horizon with resources and mastery checks;
- a React interface organized as Map, Journey, and Now;
- local IndexedDB persistence with project export and import;
- package tests and a parameterized Playwright journey across all three domains.

The first automated-researcher milestone is also available as an optional local workflow. It uses the authenticated Codex CLI to discover resource candidates for one existing capability, then emits an unreviewed JSON proposal that the website can display. It never edits the graph automatically, and the offline learning loop still requires no LLM.

The public intake accepts any topic text, but planning currently proceeds only when that topic resolves to a reviewed graph pack. An unknown topic remains an explicit unmapped request; building cited draft maps for those requests is the next researcher boundary.

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

## Research one capability

The optional researcher requires an authenticated Codex CLI with live web search. The query shown before execution leaves the device; learner evidence and the browser project do not.

```bash
pnpm research -- \
  --graph quantum-physics-foundations \
  --capability q.cap.two-path-interference \
  --output ./proposal.json
```

The command creates a new file, refuses to overwrite an existing path, runs read-only with a three-minute ceiling, and records the exact model plus CLI-reported token usage when available. In the website, use **Import proposal** under **Optional intelligence · review only** to inspect its candidates, visible ranking signals, rights boundary, warnings, and pipeline receipts. Imported proposals are size- and budget-bounded, remain pending, reset when the active graph changes, and cannot mutate the knowledge graph.

## Validate

```bash
pnpm validate
pnpm e2e
```

`validate` checks TypeScript, foundation data, package behavior—including researcher safety invariants—and the production build. `e2e` runs the complete browser loop for all three domains, export/import recovery, and the proposal-review boundary.

## Repository shape

The implementation uses TypeScript, React, Vite, pnpm workspaces, Vitest, and Playwright. The graph and planner are pure TypeScript packages with no React, storage, clock, random, or network dependency. The app composes those packages with static repository data and browser-local learner state.

## Licenses

Software source code and configuration are available under the [MIT License](LICENSE). Repository-authored documentation, schemas, example knowledge graphs, and visual assets are available under [CC BY 4.0](LICENSE-DATA.md). Linked third-party resources retain their original rights and are never relicensed by LearnAnything.
