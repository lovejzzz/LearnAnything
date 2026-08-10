# ADR 0002: Separate software and knowledge licenses

- Status: accepted
- Date: 2026-08-10

## Context

LearnAnything publishes both software and reusable knowledge artifacts. A public production release needs explicit reuse terms without implying that linked third-party resources are redistributed or relicensed.

## Decision

- Software source code and configuration use the MIT License.
- Repository-authored documentation, schemas, example knowledge graphs, and visual assets use CC BY 4.0 unless a file states otherwise.
- External resources remain link-only or metadata-only according to their graph source records. Their original rights are not changed by this decision.

## Consequences

- Code can be reused under a familiar permissive software license.
- Knowledge artifacts can be copied and adapted with attribution.
- Contributors must continue recording provenance and content-use policy for every external source.
- A graph cannot claim CC BY 4.0 for third-party material that the repository does not own.
