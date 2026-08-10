# Changelog

All notable changes to LearnAnything are documented in this file.

## 0.3.0 - 2026-08-10

### Added

- A free-form learning intake for topic, current position, desired capability, and weekly time.
- A pure deterministic `goal-model` package that resolves learner language into reviewed graph packs and target capabilities without network or model access.
- Visible learning-gap framing before the existing Map, Journey, and Now course surfaces.
- Data-driven topic aliases, bounded input validation, and starting-capability suggestions that remain unselected until the learner confirms them.
- Cross-browser coverage for all three free-form domain journeys, unknown topics, and the boundary between self-description and demonstrated evidence.

### Changed

- Replaced the seed-domain-first homepage with destination-first intake and explicit learner placement.
- Goals now preserve the learner's stated outcome while the learner still approves the operational target capability.

### Not included

- Unknown topics do not yet produce a graph. The site stops visibly instead of presenting an AI-generated course as reviewed knowledge.
- Free-text self-description never establishes mastery; diagnostics or completed evidence remain required.

## 0.2.0 - 2026-08-10

### Added

- A bounded `researcher` package that normalizes, deduplicates, and deterministically ranks AI-discovered resource candidates using separate visible signals.
- An optional local Codex CLI workflow with native web search and structured output for researching one existing capability.
- Versioned research-proposal and model-output schemas, pipeline receipts, explicit query disclosure, request/storage/runtime budgets, exact model and reported-usage metadata, and safe link-only rights defaults.
- A website review surface for locally importing unreviewed proposals without mutating the published graph.
- Researcher safety tests and cross-browser coverage for unsafe URLs, malformed signals, oversized proposals, graph switching, and the proposal/graph authority boundary.

### Changed

- Advanced the built-in researcher documentation from a future boundary to the first resource-discovery milestone.

### Not included

- Automatic graph publication, recursive crawling, hosted API credentials, AI mastery decisions, and generated course content remain out of scope.

## 0.1.0 - 2026-08-10

### Added

- First complete offline learning loop for quantum physics, philosophy, and Minecraft Redstone.
- Deterministic knowledge-graph validation, learner modeling, path planning, mastery checks, and local project persistence.
- Domain diagnostics, prior-familiarity evidence, learning resources, practice experiences, and mastery demonstrations.
- Browser workflows for planning, completing evidence-backed actions, inspecting progress, and exporting or importing learner projects.
- Unit, integration, accessibility, and end-to-end coverage for all three example domains.
- Auditable artifact and evaluator references for non-diagnostic mastery evidence.
- Production security headers, metadata, health endpoint, and GitHub Actions validation.
- Responsive touch-target, skip-link, destructive-action confirmation, and contrast regression coverage.
- Branded browser icon metadata using the production social image.
- Reload-persistence and safe unsupported-domain import regression coverage across Chromium, Firefox, and WebKit.
- MIT software and CC BY 4.0 knowledge/documentation licensing.

### Changed

- Expanded the example graphs to provide complete learn-practice-demonstrate loops for every capability.
- Updated the learning-path schema and project migration support for action-oriented planning horizons.
- Updated the architecture, learning model, build handoff, and setup documentation for the offline vertical slice.
- Prepared the Vite app for Cloudflare Worker-compatible static delivery, routing the application shell through the Worker so production security headers apply to every navigation without adding an application backend.
- Added concise path and weekly workload summaries, safer project clearing, and improved cross-browser mobile and keyboard accessibility.
- Rejected unsupported-domain imports before they can replace the saved browser project, clarified count labels, and updated CI actions to supported runtimes.

### Not included

- Automated research, web discovery, and generated learning resources remain deferred to a later milestone.
