import type { Depth, GraphNode, KnowledgeGraph, ResourceDetails } from "@learn-anything/contracts";

export const RESEARCH_PROPOSAL_SCHEMA_VERSION = "0.1.0" as const;

export type ResearchSignal = "unknown" | "weak" | "moderate" | "strong";
export type CandidateSourceType = "primary" | "official" | "scholarly" | "open-education" | "reference" | "community";

export interface ResearchSignals {
  authority: ResearchSignal;
  relevance: ResearchSignal;
  pedagogicalFit: ResearchSignal;
  accessibility: ResearchSignal;
  freshness: ResearchSignal;
  transparency: ResearchSignal;
  licenseClarity: ResearchSignal;
  versionMatch: ResearchSignal;
  learnerUsefulness: ResearchSignal;
}

export interface ResearchBudget {
  maxCandidates: number;
  maxWebSearches: number;
  maxStoredBytes: number;
  maxRuntimeSeconds: number;
}

export interface ResearchBrief {
  schemaVersion: typeof RESEARCH_PROPOSAL_SCHEMA_VERSION;
  id: string;
  graphId: string;
  graphVersion: string;
  capabilityId: string;
  capabilityTitle: string;
  capabilitySummary: string;
  depth: Depth;
  language: string;
  learnerContext: string;
  jurisdiction: string;
  freshnessRequirement: string;
  safetyBoundary: string;
  requestedOutput: "resource-candidates";
  disclosedQuery: string;
  budget: ResearchBudget;
  createdAt: string;
}

export interface DiscoveredResourceCandidate {
  title: string;
  url: string;
  publisher: string;
  sourceType: CandidateSourceType;
  format: ResourceDetails["format"];
  access: ResourceDetails["access"];
  description: string;
  rationale: string;
  signals: ResearchSignals;
}

export interface ResearchDiscovery {
  schemaVersion: typeof RESEARCH_PROPOSAL_SCHEMA_VERSION;
  candidates: DiscoveredResourceCandidate[];
  warnings: string[];
}

export interface ResearchCandidate extends DiscoveredResourceCandidate {
  id: string;
  rank: number;
  targetCapabilityId: string;
  contentUse: "link-only";
  license: {
    status: "unknown";
    identifier: "";
    attributionRequired: false;
    redistributionAllowed: false;
    derivativesAllowed: false;
    notes: string;
  };
}

export interface ResearchReceipt {
  stage: "brief" | "discovery" | "normalization" | "ranking" | "proposal";
  status: "succeeded" | "warning";
  recordedAt: string;
  detail: string;
}

export interface ResourceResearchProposal {
  schemaVersion: typeof RESEARCH_PROPOSAL_SCHEMA_VERSION;
  id: string;
  brief: ResearchBrief;
  method: {
    kind: "ai-assisted";
    provider: "codex-cli";
    model: string;
    reportedTokenUsage: number | null;
  };
  trust: "ai-proposed-unreviewed";
  reviewStatus: "pending";
  createdAt: string;
  receipts: ResearchReceipt[];
  candidates: ResearchCandidate[];
  warnings: string[];
}

const signalWeight: Record<ResearchSignal, number> = {
  unknown: 0,
  weak: 1,
  moderate: 2,
  strong: 3,
};

const signalOrder: Array<keyof ResearchSignals> = [
  "relevance",
  "authority",
  "pedagogicalFit",
  "accessibility",
  "licenseClarity",
  "freshness",
  "versionMatch",
  "transparency",
  "learnerUsefulness",
];

const signalValues = new Set<ResearchSignal>(["unknown", "weak", "moderate", "strong"]);
const sourceTypes = new Set<CandidateSourceType>(["primary", "official", "scholarly", "open-education", "reference", "community"]);
const formats = new Set<ResourceDetails["format"]>(["article", "book", "documentation", "video", "simulation", "course", "tool", "other"]);
const accessValues = new Set<ResourceDetails["access"]>(["free", "freemium", "paid", "unknown"]);
const MAX_CANDIDATES = 20;
const MAX_WEB_SEARCHES = 10;
const MAX_STORED_BYTES = 64_000;
const MAX_RUNTIME_SECONDS = 600;
const receiptStages: ResearchReceipt["stage"][] = ["brief", "discovery", "normalization", "ranking", "proposal"];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function canonicalUrl(value: string): string {
  const url = new URL(value);
  assert(url.protocol === "https:" || url.protocol === "http:", `Unsupported candidate URL protocol: ${url.protocol}`);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_") || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(key)) url.searchParams.delete(key);
  }
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString();
}

function compareCandidates(left: DiscoveredResourceCandidate, right: DiscoveredResourceCandidate): number {
  for (const signal of signalOrder) {
    const difference = signalWeight[right.signals[signal]] - signalWeight[left.signals[signal]];
    if (difference !== 0) return difference;
  }
  return canonicalUrl(left.url).localeCompare(canonicalUrl(right.url));
}

function capabilityFromGraph(graph: KnowledgeGraph, capabilityId: string): GraphNode {
  const capability = graph.nodes.find((node) => node.id === capabilityId);
  assert(capability?.kind === "capability", `Unknown capability: ${capabilityId}`);
  return capability;
}

function assertResearchBudget(value: unknown): asserts value is ResearchBudget {
  assert(isRecord(value), "Research proposal budget is invalid");
  assert(Number.isInteger(value.maxCandidates) && Number(value.maxCandidates) >= 1 && Number(value.maxCandidates) <= MAX_CANDIDATES, `Research candidate budget must be between 1 and ${MAX_CANDIDATES}`);
  assert(Number.isInteger(value.maxWebSearches) && Number(value.maxWebSearches) >= 1 && Number(value.maxWebSearches) <= MAX_WEB_SEARCHES, `Research search budget must be between 1 and ${MAX_WEB_SEARCHES}`);
  assert(Number.isInteger(value.maxStoredBytes) && Number(value.maxStoredBytes) >= 1 && Number(value.maxStoredBytes) <= MAX_STORED_BYTES, `Research storage budget must be between 1 and ${MAX_STORED_BYTES} bytes`);
  assert(Number.isInteger(value.maxRuntimeSeconds) && Number(value.maxRuntimeSeconds) >= 30 && Number(value.maxRuntimeSeconds) <= MAX_RUNTIME_SECONDS, `Research runtime budget must be between 30 and ${MAX_RUNTIME_SECONDS} seconds`);
}

export function createResearchBrief(
  graph: KnowledgeGraph,
  capabilityId: string,
  createdAt: string,
  overrides: Partial<Pick<ResearchBrief, "learnerContext" | "jurisdiction" | "freshnessRequirement" | "safetyBoundary">> = {},
): ResearchBrief {
  const capability = capabilityFromGraph(graph, capabilityId);
  return {
    schemaVersion: RESEARCH_PROPOSAL_SCHEMA_VERSION,
    id: `research-brief.${stableHash(`${graph.id}:${graph.version}:${capability.id}:${createdAt}`)}`,
    graphId: graph.id,
    graphVersion: graph.version,
    capabilityId: capability.id,
    capabilityTitle: capability.title,
    capabilitySummary: capability.summary,
    depth: capability.depth,
    language: graph.language,
    learnerContext: overrides.learnerContext ?? "Independent learner using a free, local-first learning path.",
    jurisdiction: overrides.jurisdiction ?? "Unspecified; do not infer legal permission from public access.",
    freshnessRequirement: overrides.freshnessRequirement ?? "Prefer maintained sources and record version-sensitive limitations.",
    safetyBoundary: overrides.safetyBoundary ?? "Educational resource discovery only; do not provide high-stakes professional advice.",
    requestedOutput: "resource-candidates",
    disclosedQuery: `${capability.title}: ${capability.summary}`,
    budget: { maxCandidates: 6, maxWebSearches: 4, maxStoredBytes: 24_000, maxRuntimeSeconds: 180 },
    createdAt,
  };
}

export function buildResearchProposal(
  brief: ResearchBrief,
  discovery: ResearchDiscovery,
  runtime: { provider: "codex-cli"; model: string; reportedTokenUsage?: number },
  createdAt: string,
): ResourceResearchProposal {
  assert(discovery.schemaVersion === RESEARCH_PROPOSAL_SCHEMA_VERSION, "Unsupported research discovery schema version");
  assertResearchBudget(brief.budget);
  assert(Array.isArray(discovery.candidates) && discovery.candidates.length <= MAX_CANDIDATES, `Research discovery cannot contain more than ${MAX_CANDIDATES} candidates`);
  assert(Array.isArray(discovery.warnings) && discovery.warnings.every((warning) => typeof warning === "string"), "Research discovery warnings are invalid");
  const byUrl = new Map<string, DiscoveredResourceCandidate>();
  for (const candidate of discovery.candidates) {
    assert(typeof candidate.title === "string" && candidate.title.length > 0 && typeof candidate.publisher === "string" && candidate.publisher.length > 0, "Discovered candidates need title and publisher metadata");
    assert(typeof candidate.description === "string" && candidate.description.length > 0 && typeof candidate.rationale === "string" && candidate.rationale.length > 0, `Discovered candidate ${candidate.title} needs a description and rationale`);
    assert(sourceTypes.has(candidate.sourceType), `Discovered candidate ${candidate.title} has an invalid source type`);
    assert(formats.has(candidate.format), `Discovered candidate ${candidate.title} has an invalid format`);
    assert(accessValues.has(candidate.access), `Discovered candidate ${candidate.title} has an invalid access value`);
    assertSignals(candidate.signals, `Discovered candidate ${candidate.title} signals`);
    const url = canonicalUrl(candidate.url);
    if (!byUrl.has(url)) byUrl.set(url, { ...candidate, url });
  }
  const limited = [...byUrl.values()].sort(compareCandidates).slice(0, brief.budget.maxCandidates);
  const candidates: ResearchCandidate[] = limited.map((candidate, index) => ({
    ...candidate,
    id: `research-candidate.${stableHash(`${brief.id}:${candidate.url}`)}`,
    rank: index + 1,
    targetCapabilityId: brief.capabilityId,
    contentUse: "link-only",
    license: {
      status: "unknown",
      identifier: "",
      attributionRequired: false,
      redistributionAllowed: false,
      derivativesAllowed: false,
      notes: "AI-assisted discovery cannot verify reuse rights. Keep link-only until a reviewer verifies the exact resource and edition.",
    },
  }));
  const duplicateCount = discovery.candidates.length - byUrl.size;
  const warnings = [
    ...discovery.warnings,
    ...(duplicateCount > 0 ? [`Removed ${duplicateCount} duplicate candidate URL${duplicateCount === 1 ? "" : "s"}.`] : []),
    ...(byUrl.size > brief.budget.maxCandidates ? [`Kept the top ${brief.budget.maxCandidates} candidates to respect the research budget.`] : []),
  ];
  return {
    schemaVersion: RESEARCH_PROPOSAL_SCHEMA_VERSION,
    id: `research-proposal.${stableHash(`${brief.id}:${createdAt}`)}`,
    brief,
    method: { kind: "ai-assisted", provider: runtime.provider, model: runtime.model, reportedTokenUsage: runtime.reportedTokenUsage ?? null },
    trust: "ai-proposed-unreviewed",
    reviewStatus: "pending",
    createdAt,
    receipts: [
      { stage: "brief", status: "succeeded", recordedAt: brief.createdAt, detail: `Bounded query disclosed: ${brief.disclosedQuery}` },
      { stage: "discovery", status: discovery.warnings.length > 0 ? "warning" : "succeeded", recordedAt: createdAt, detail: `${discovery.candidates.length} candidate records returned by ${runtime.provider}.` },
      { stage: "normalization", status: duplicateCount > 0 ? "warning" : "succeeded", recordedAt: createdAt, detail: "Canonicalized URLs, removed duplicates, and forced unknown rights to link-only." },
      { stage: "ranking", status: "succeeded", recordedAt: createdAt, detail: "Ranked deterministically by the visible signal tuple; no combined quality score was created." },
      { stage: "proposal", status: "succeeded", recordedAt: createdAt, detail: "Created a pending review proposal without mutating the knowledge graph." },
    ],
    candidates,
    warnings,
  };
}

function assertSignals(value: unknown, label: string): asserts value is ResearchSignals {
  assert(isRecord(value), `${label} must be an object`);
  for (const signal of signalOrder) assert(signalValues.has(value[signal] as ResearchSignal), `${label}.${signal} is invalid`);
}

export function parseResearchDiscovery(serialized: string): ResearchDiscovery {
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new Error(`Research discovery is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  assert(isRecord(value) && value.schemaVersion === RESEARCH_PROPOSAL_SCHEMA_VERSION, "Unsupported research discovery schema version");
  assert(Array.isArray(value.candidates) && Array.isArray(value.warnings), "Research discovery is invalid");
  return value as unknown as ResearchDiscovery;
}

export function parseResearchProposal(serialized: string): ResourceResearchProposal {
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new Error(`Research proposal is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  assert(isRecord(value), "Research proposal must be an object");
  assert(value.schemaVersion === RESEARCH_PROPOSAL_SCHEMA_VERSION, "Unsupported research proposal schema version");
  assert(isNonEmptyString(value.id), "Research proposal needs an ID");
  assert(value.trust === "ai-proposed-unreviewed", "Research proposals must remain visibly unreviewed");
  assert(value.reviewStatus === "pending", "Only pending research proposals can be imported");
  assert(isIsoDate(value.createdAt), "Research proposal needs a valid creation time");
  assert(isRecord(value.method) && value.method.kind === "ai-assisted" && value.method.provider === "codex-cli" && isNonEmptyString(value.method.model) && (value.method.reportedTokenUsage === null || (Number.isInteger(value.method.reportedTokenUsage) && Number(value.method.reportedTokenUsage) >= 0)), "Research proposal method is invalid");
  assert(
    isRecord(value.brief)
      && value.brief.schemaVersion === RESEARCH_PROPOSAL_SCHEMA_VERSION
      && isNonEmptyString(value.brief.id)
      && isNonEmptyString(value.brief.graphId)
      && isNonEmptyString(value.brief.graphVersion)
      && isNonEmptyString(value.brief.capabilityId)
      && isNonEmptyString(value.brief.capabilityTitle)
      && isNonEmptyString(value.brief.capabilitySummary)
      && ["orientation", "foundation", "working", "advanced"].includes(String(value.brief.depth))
      && isNonEmptyString(value.brief.language)
      && isNonEmptyString(value.brief.learnerContext)
      && isNonEmptyString(value.brief.jurisdiction)
      && isNonEmptyString(value.brief.freshnessRequirement)
      && isNonEmptyString(value.brief.safetyBoundary)
      && value.brief.requestedOutput === "resource-candidates"
      && isNonEmptyString(value.brief.disclosedQuery)
      && isIsoDate(value.brief.createdAt),
    "Research proposal brief is invalid",
  );
  assertResearchBudget(value.brief.budget);
  assert(Array.isArray(value.candidates) && value.candidates.length <= Number(value.brief.budget.maxCandidates), "Research proposal exceeds its candidate budget");
  const capabilityId = value.brief.capabilityId;
  const ids = new Set<string>();
  const urls = new Set<string>();
  value.candidates.forEach((candidate, index) => {
    assert(isRecord(candidate), `Candidate ${index + 1} must be an object`);
    assert(typeof candidate.id === "string" && !ids.has(candidate.id), `Candidate ${index + 1} has an invalid or duplicate ID`);
    ids.add(candidate.id);
    assert(candidate.rank === index + 1, `Candidate ${candidate.id} has an invalid rank`);
    assert(candidate.targetCapabilityId === capabilityId, `Candidate ${candidate.id} targets a different capability`);
    assert(isNonEmptyString(candidate.title) && isNonEmptyString(candidate.publisher), `Candidate ${candidate.id} needs title and publisher metadata`);
    assert(isNonEmptyString(candidate.description) && isNonEmptyString(candidate.rationale), `Candidate ${candidate.id} needs a description and rationale`);
    const url = canonicalUrl(String(candidate.url));
    assert(!urls.has(url), `Candidate ${candidate.id} duplicates another URL`);
    urls.add(url);
    assert(sourceTypes.has(candidate.sourceType as CandidateSourceType), `Candidate ${candidate.id} has an invalid source type`);
    assert(formats.has(candidate.format as ResourceDetails["format"]), `Candidate ${candidate.id} has an invalid format`);
    assert(accessValues.has(candidate.access as ResourceDetails["access"]), `Candidate ${candidate.id} has an invalid access value`);
    assert(candidate.contentUse === "link-only", `Candidate ${candidate.id} must remain link-only before review`);
    assert(
      isRecord(candidate.license)
        && candidate.license.status === "unknown"
        && candidate.license.identifier === ""
        && candidate.license.attributionRequired === false
        && candidate.license.redistributionAllowed === false
        && candidate.license.derivativesAllowed === false
        && isNonEmptyString(candidate.license.notes),
      `Candidate ${candidate.id} has unsafe license claims`,
    );
    assertSignals(candidate.signals, `Candidate ${candidate.id} signals`);
  });
  assert(Array.isArray(value.receipts) && value.receipts.length === receiptStages.length, "Research proposal must include every pipeline receipt");
  value.receipts.forEach((receipt, index) => {
    assert(
      isRecord(receipt)
        && receipt.stage === receiptStages[index]
        && (receipt.status === "succeeded" || receipt.status === "warning")
        && isIsoDate(receipt.recordedAt)
        && isNonEmptyString(receipt.detail),
      `Research proposal receipt ${index + 1} is invalid`,
    );
  });
  assert(Array.isArray(value.warnings) && value.warnings.every((warning) => typeof warning === "string"), "Research proposal warnings are invalid");
  return value as unknown as ResourceResearchProposal;
}

export function serializeResearchProposal(proposal: ResourceResearchProposal): string {
  return `${JSON.stringify(proposal, null, 2)}\n`;
}
