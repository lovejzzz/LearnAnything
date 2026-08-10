# Learning model

## Overview

LearnAnything separates shared knowledge from private learner state.

The global graph answers: **What is the territory?**

The learner model answers: **Where is this person in that territory, and what evidence supports that belief?**

The path planner answers: **Given the destination and constraints, what should happen next?**

None of these may impersonate another.

## Shared graph primitives

### Concept

An idea, model, distinction, mechanism, object, or vocabulary item that helps a learner reason. A concept is not automatically a learning objective.

### Capability

An observable thing a learner can do in a context to a declared quality bar. Capabilities are the spine of paths.

Good: `Analyze a two-path interference experiment using probability amplitudes.`

Weak: `Understand interference.`

### Resource

An external or repository-authored item that can support learning: documentation, textbook section, primary source, video, simulation, wiki page, problem set, or tool. A resource has provenance and content-use boundaries.

### Experience

Something the learner does or encounters: reading, experiment, guided derivation, comparison, build, discussion, observation, or practice sequence.

### Mastery check

A prompt or performance condition that produces evidence about one or more capabilities. Checks should prefer authentic work and explanation over recognition-only quizzes.

### Milestone

A meaningful integration point where several capabilities combine into a project, performance, analysis, or decision.

## Relationships

Initial graph relationships are deliberately small:

- `requires`: the target normally depends on the source;
- `supports`: a concept or resource helps develop a capability;
- `teaches`: an experience develops a capability;
- `assesses`: a mastery check provides evidence about a capability;
- `contains`: a domain or milestone groups a smaller object;
- `applies-in`: a capability transfers into another context;
- `contrasts-with`: objects must be compared but neither is a prerequisite;
- `alternative-to`: two routes can serve similar purposes.

`requires` edges form a directed acyclic graph inside one published graph version. Disagreements about prerequisite order are represented as alternative pathway annotations or separate scoped edges, not cycles.

## Depth

Nodes use four broad depth bands:

- `orientation`: recognize the landscape, vocabulary, and motivating questions;
- `foundation`: perform core operations with support;
- `working`: apply capabilities independently in representative situations;
- `advanced`: integrate, critique, transfer, or contribute in specialist contexts.

Depth is contextual. “Working knowledge” for a casual player and a professional engineer can imply different capabilities even when they share concepts.

## Learner state

Learner state records evidence, not a single percentage.

Each capability can have:

- `unseen` — no evidence;
- `exploring` — activity exists but evidence is insufficient;
- `supported` — succeeds with scaffolding;
- `independent` — succeeds independently in a representative context;
- `transfer` — succeeds in a materially different context;
- `stale` — earlier evidence exists but should be refreshed.

An evidence record includes:

- capability ID;
- evidence type;
- artifact or response reference;
- evaluator: self, deterministic, peer, expert, or optional AI;
- result and confidence;
- conditions and scaffolding;
- timestamp;
- graph and mastery-check versions.

An AI judgment is one evidence class, never a hidden upgrade to truth.

A prior-capability selection is a self-report and derives `supported`, not `independent`. Independent status requires a current mastery-check result. A graph may include a short deterministic diagnostic when representative answers can be scored locally without pretending to evaluate an artifact, interpretation, build, or performance that requires human judgment.

## Goals

A goal contains:

- a human description;
- target capability IDs;
- desired depth;
- purpose;
- time budget and optional deadline;
- allowed or excluded branches;
- modality and accessibility constraints;
- evidence expectations;
- unresolved clarification questions.

The product may suggest target capabilities, but the learner approves the destination.

## Path planning

The first deterministic planner should:

1. take target capabilities;
2. compute their transitive `requires` closure;
3. remove capabilities with current `independent` or `transfer` evidence unless reassessment is due;
4. topologically order the remaining graph;
5. group nearby capabilities into stages and milestones;
6. attach resources, experiences, and mastery checks;
7. fit the next horizon to available hours;
8. retain explanations for every inclusion, exclusion, and ordering decision.

The planner budgets horizon actions rather than treating a capability's full estimate as indivisible. Each reachable capability should expose a learn-practice-demonstrate sequence: a free supporting resource, a repository-authored practice experience, and a mastery check. A horizon is a budgeted prefix of those actions at the current prerequisite frontier; the full capability estimate remains visible in the journey.

The planner outputs a view. It never edits the knowledge graph or learner evidence.

## Adaptation

Replanning is triggered by evidence:

- success can unlock dependents or shorten practice;
- failure can reveal a missing prerequisite or require a different experience;
- a learner can reject a resource without rejecting the capability;
- changed goals can reuse already demonstrated capabilities;
- stale knowledge can insert a short retrieval check;
- unexpected success can allow diagnostic skipping.

The system preserves historical plans and evidence so adaptation remains explainable.

## Learning horizon

The map can span years. The actionable horizon should usually span one week or a small number of capability loops.

Every horizon answers:

- why these capabilities are next;
- what the learner will do;
- how long it may take;
- which resources are optional or substitutable;
- what evidence will show progress;
- what becomes possible afterward.

## Quality boundaries

Keep separate measures for:

- graph integrity;
- source and license integrity;
- path prerequisite validity;
- resource usefulness;
- mastery evidence strength;
- learner progress;
- user experience and accessibility.

Do not average these into one number. A graph can be structurally valid but educationally poor; a learner can finish resources without mastering the target; a useful path can contain an inaccessible resource.
