# Built-in researcher

## Purpose

The researcher turns open knowledge into reviewable graph patch proposals. It does not generate opaque courses and it does not publish directly.

The long-term researcher should answer:

- What capabilities define this destination at different depths?
- Which prerequisites are strongly supported, conventional, disputed, or route-specific?
- Which free resources teach or assess each capability?
- Which sources are authoritative for this kind of claim?
- What may LearnAnything legally store, excerpt, transform, or redistribute?
- Where is evidence thin, stale, conflicting, inaccessible, or language-limited?

## Zero-cost strategy

Research is amortized across learners. A domain graph is researched, reviewed, versioned, compressed, and reused. Per-learner work is deterministic path planning over existing graph data.

Generative AI is optional. The baseline researcher combines:

- source-specific metadata APIs and snapshots;
- public knowledge graphs;
- tables of contents and heading structure;
- citations, identifiers, and link graphs;
- deterministic text and metadata extraction;
- community and expert proposals;
- lightweight local ranking and deduplication;
- explicit review queues.

## Pipeline

```text
research brief
  -> source routing
  -> discovery candidates
  -> metadata and license capture
  -> bounded permitted extraction
  -> normalization and deduplication
  -> capability/resource/edge candidates
  -> confidence and conflict analysis
  -> graph patch proposal
  -> human/community review
  -> published graph version
```

Every stage emits a receipt. Failed or uncertain stages remain visible.

## Research brief

A research job begins with:

- topic and intended destination;
- depth and learner context;
- language and jurisdiction if relevant;
- source-type priorities;
- freshness requirements;
- safety or high-stakes boundary;
- requested output: orientation map, prerequisite expansion, resource refresh, or gap repair;
- maximum request and storage budget.

The job never begins with “crawl the web about X.”

## Source routing

Different domains require different source families.

### Structured orientation

Use public knowledge graphs and encyclopedia metadata to identify entities, aliases, broad relationships, and external identifiers. This layer proposes the territory; it does not establish instructional order or factual sufficiency by itself.

### Scholarship

Use scholarly metadata indexes for works, citation relationships, authors, topics, retractions, and open-access indicators. Metadata is not the same as permission to copy full text.

### Open educational resources

Use openly licensed textbooks, courses, simulations, and problem collections when their exact license and attribution rules permit the intended use. Store license per edition or resource, never by publisher reputation alone.

### Primary and official sources

Prefer primary texts, standards, official documentation, specifications, and maintained project wikis when the learning goal depends on exact current behavior.

### Community and practical knowledge

For domains such as Minecraft, crafts, tools, or games, community sources can be primary practical evidence. Record platform/version, maintainer, update date, and whether advice is consensus, convention, or one technique.

### Broad web discovery

Broad crawl indexes may discover candidates but are not a truth or licensing layer. A discovered page must pass source, freshness, rights, and content-use checks before it contributes anything beyond a link candidate.

## Source record and content use

Every source has an explicit `contentUse`:

- `link-only`: store URL and minimal identifying metadata;
- `metadata`: store bibliographic, structural, and discovery metadata;
- `excerpt`: store bounded excerpts under an identified permission or legal basis;
- `redistributable`: store or adapt content according to an explicit open license;
- `repository-authored`: original LearnAnything/community content under the future knowledge license.

Unknown license means `link-only`. Public access never implies permission to copy, adapt, train on, or redistribute.

The source record also includes:

- canonical URL or persistent identifier;
- title, creator, publisher, and date;
- retrieval timestamp;
- source type and authority tier;
- license identifier, status, and attribution text;
- permitted content use;
- freshness and version scope;
- hash of retained permitted content, when any;
- extraction method;
- discovered-via provenance.

## Proposal model

The researcher proposes patches:

```text
add/update/remove node
add/update/remove edge
add/update/remove source
attach/detach source support
mark conflict or uncertainty
deprecate or supersede resource
```

Each operation includes evidence, confidence, method, and rationale. Deterministic extraction, contributor authorship, and AI assistance remain distinguishable.

## Prerequisite inference

Candidate prerequisite evidence can come from:

- repeated ordering across independent curricula;
- explicit “requires” or “before learning” language;
- formal dependency, such as mathematics used by a later capability;
- assessment failure that resolves after a prerequisite intervention;
- expert or community review;
- knowledge-graph relationships;
- table-of-contents structure.

No single weak signal should silently create a hard `requires` edge. Weak evidence becomes a proposal, `supports` relation, or pathway-specific ordering.

## Ranking resources

Rank with separate signals rather than one opaque score:

- authority and expertise;
- relevance to the exact capability;
- pedagogical fit and depth;
- accessibility and format;
- freshness and version match;
- source transparency;
- license and reuse clarity;
- learner usefulness evidence;
- availability and link health.

A famous resource can be inaccessible, outdated, or poorly matched. A high ranking must remain explainable.

## Caching and limits

- Cache source responses by canonical request and respect provider terms.
- Back off on rate limits and use an identifiable contact-aware user agent.
- Prefer snapshots for reusable bulk indexes.
- Schedule refresh by source volatility, not one universal interval.
- Store compact normalized metadata rather than raw crawl payloads.
- Never run unbounded recursive crawling.
- Keep network, storage, and optional AI budgets explicit in every job.

## Trust and review

Published graph data should display evidence classes such as:

- deterministic-source-derived;
- contributor-authored;
- community-reviewed;
- expert-reviewed;
- learner-evidence-supported;
- AI-proposed-unreviewed;
- disputed;
- stale.

Reviewers approve individual patch operations or coherent bounded patches. They do not approve a giant generated domain in one click.

## First implementation boundary

Do not build the automated researcher during the first vertical slice. Start with manually authored seed graphs that already obey the source contract. The first researcher milestone, after the learning loop works, should discover and rank candidate resources for one existing capability without changing the graph automatically.

## Known source considerations

At foundation time:

- Wikidata provides broad CC0 structured data and multiple access methods, but services require considerate usage and large traversals should use dumps.
- Crossref provides public scholarly metadata with rate and concurrency limits; responses should be cached and requests identified.
- OpenAlex offers free bulk snapshots while live API usage has a free allowance and paid overage; the architecture must not assume unlimited free search.
- Common Crawl is a free broad discovery corpus, not a curated truth or rights database.
- Open educational resource terms vary by work and edition. Attribution, noncommercial, ShareAlike, and AI-ingestion restrictions must be captured individually.

These are source-adapter constraints, not permanent endorsements. Recheck current official terms before implementation.
