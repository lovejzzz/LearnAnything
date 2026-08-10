# Contributing

LearnAnything welcomes contributions to code, knowledge maps, resources, translations, accessibility, and learning design. Code contributions are accepted under MIT; repository-authored knowledge and documentation contributions are accepted under CC BY 4.0. Do not submit third-party content unless its license and permitted use are explicit and compatible.

## Knowledge contributions

A knowledge contribution must state:

- what capability, concept, relationship, resource, or mastery check changes;
- why the change improves a goal-bound learning path;
- the source and its authority;
- the source's license and permitted content use;
- whether the contribution was written by the contributor, extracted deterministically, or proposed with AI assistance;
- which of the three seed-domain invariants it exercises.

The system should accept graph patch proposals, not opaque generated courses. Proposed changes remain reviewable before publication.

## Code contributions

Read `AGENTS.md` and the documents it references. Keep business logic out of the web UI, avoid new infrastructure during the MVP, and run:

```bash
npm test
```

before opening a pull request.
