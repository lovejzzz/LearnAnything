# MVP: the first real learning loop

## Objective

Prove that one general graph and planner can produce an understandable, prerequisite-correct next horizon across quantum physics, philosophy, and Minecraft Redstone without AI or a backend.

## User-visible scope

The learner can:

1. choose one of the three seed domains;
2. inspect the whole capability map;
3. select a destination capability;
4. mark capabilities they believe they already have;
5. answer a small deterministic diagnostic;
6. receive a prerequisite-closed path with inclusion reasons;
7. see a next-seven-day horizon fitted to an hours-per-week setting;
8. open linked free resources;
9. complete a mastery check and record evidence;
10. see learner state and the path update;
11. export and re-import learner state locally.

## Required seed-domain properties

Each domain should eventually contain 50–100 capabilities. The first implementation can use the compact examples in `examples/`, then expand them only after the loop works.

The domains must exercise different structures:

- **Quantum physics:** strict mathematical and conceptual prerequisites.
- **Philosophy:** alternative routes, contrasts, primary sources, and disputed interpretations.
- **Minecraft Redstone:** version-sensitive mechanics, practical builds, debugging, and performance evidence.

No domain-specific conditional belongs in the graph or planner package.

## Explicit exclusions

- Automated web research or crawling.
- AI-generated explanations, paths, or assessments.
- User accounts, social features, sync, or credentials.
- Payments, subscriptions, certificates, streaks, or gamification.
- More domains.
- A giant three-year calendar generated upfront.
- Hosting copied resource content.

## Acceptance criteria

- The app works after dependencies are installed with network disabled.
- Planner results are deterministic and explain every included capability.
- Every planned capability is either a target or in its prerequisite closure.
- A learner cannot unlock a dependent solely by opening a resource.
- Completing evidence updates learner state without editing graph data.
- Replanning preserves prior plan and evidence history.
- The same planner passes tests against all three domains.
- Browser state can be exported, cleared, and restored.
- The primary Playwright journey passes for each domain.
- Accessibility includes keyboard operation, visible focus, semantic structure, reduced-motion support, and no color-only status.

## Learning research questions

The MVP should help answer:

- Does seeing the full map improve orientation or create overwhelm?
- Do learners understand why a prerequisite is included?
- Can they distinguish activity from mastery?
- Is a seven-day horizon the right size?
- Do the three domains need new general primitives?
- What evidence can be evaluated deterministically and what requires self, peer, or expert review?

Record answers as product research, not as extra features.
