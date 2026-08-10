# LearnAnything repository instructions

## Mission

Build a free, local-first system that maps a field, locates a learner inside it, and guides the learner toward a declared capability through demonstrated mastery.

The product is a knowledge map plus adaptive path planner. It is not a chatbot, content farm, ten-lesson course generator, LMS clone, or model-training project.

## Read before changing code

1. `docs/PRODUCT.md`
2. `docs/LEARNING_MODEL.md`
3. `docs/ARCHITECTURE.md`
4. `docs/MVP.md`
5. `docs/BUILD_HANDOFF.md`

Read `docs/RESEARCHER.md` before changing source discovery, extraction, ranking, licensing, or provenance behavior.

## Non-negotiable architecture

- The versioned knowledge graph is the shared source of truth.
- Learner state is separate, private, local-first, and exportable.
- A learning path is a computed, prerequisite-closed view of the graph, never a second source of truth.
- Mastery requires evidence. Resource consumption alone is not mastery.
- The core experience must work without an LLM, API key, account, or backend.
- AI may propose graph changes or explanations but may not silently become the authority.
- Every external resource carries provenance, license status, and an explicit content-use policy.
- Link to content by default. Never copy, train on, excerpt, or redistribute content merely because it is publicly reachable.
- Research, planning, quality evaluation, and rendering are separate packages.
- Quality checks report defects; they do not silently repair source data.
- Maintain quantum physics, philosophy, and Minecraft Redstone fixtures. A general abstraction must work across all three without domain-specific hacks in the core.

## Initial stack

- TypeScript
- pnpm workspaces
- React + Vite for `apps/web`
- pure TypeScript packages for graph, planner, mastery, and researcher contracts
- Vitest for unit/integration tests
- Playwright for the browser journey
- static JSON knowledge packs and IndexedDB learner state for the MVP

Do not introduce a server, database service, authentication provider, vector database, generative AI dependency, or crawler during the first vertical slice.

## Package boundaries

- `knowledge-graph`: schemas, graph invariants, queries, prerequisite closure.
- `learner-model`: private learner state and evidence history.
- `goal-model`: operational learner goals.
- `path-planner`: computes routes; does not mutate graph or learner state.
- `mastery`: evaluates evidence and recommends reassessment.
- `researcher`: proposes source-backed graph patches; does not publish directly.
- `source-adapters`: source-specific metadata retrieval behind one contract.
- `project-store`: local persistence, import, export, and migrations.
- `ui`: reusable presentation components only.

The web app orchestrates packages. Business logic does not live in React components or hooks.

## Engineering rules

- Prefer small modules with one owner and explicit inputs/outputs.
- No production source file should exceed 800 lines without a recorded architecture decision.
- Add no new package until an existing milestone requires the boundary.
- Keep `npm test` fast and offline.
- Preserve deterministic output for the same graph, learner state, goal, and planner version.
- Version every persisted contract and provide migrations before changing it incompatibly.
- Never commit generated corpora, browser artifacts, model weights, caches, or large research outputs.
- Do not report a quality score that mixes source integrity, path validity, mastery, and user outcomes into one number.

## Definition of done

A change is done when the relevant contracts and invariants pass, the three-domain fixtures remain valid, behavior is tested at the package boundary, and user-facing claims stay within the evidence actually collected.

## Immediate task

Follow `docs/BUILD_HANDOFF.md`. Build the first offline vertical slice before expanding the researcher or adding more domains.
