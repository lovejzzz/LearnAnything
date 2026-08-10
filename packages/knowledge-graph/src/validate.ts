import type { KnowledgeGraph } from "@learn-anything/contracts";
import { findRequiresCycle } from "./queries";

const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const NODE_KINDS = new Set(["concept", "capability", "resource", "experience", "mastery-check", "milestone"]);
const DEPTHS = new Set(["orientation", "foundation", "working", "advanced"]);
const RELATIONS = new Set([
  "requires",
  "supports",
  "teaches",
  "assesses",
  "contains",
  "applies-in",
  "contrasts-with",
  "alternative-to",
]);
const RESOURCE_FORMATS = new Set(["article", "book", "documentation", "video", "simulation", "course", "tool", "other"]);
const RESOURCE_ACCESS = new Set(["free", "freemium", "paid", "unknown"]);
const EVIDENCE_TYPES = new Set(["explanation", "solution", "analysis", "build", "performance", "project", "reflection"]);
const EVALUATORS = new Set(["self", "deterministic", "peer", "expert", "optional-ai"]);
const SOURCE_TYPES = new Set(["primary", "official", "scholarly", "open-education", "reference", "community", "repository-authored"]);
const AUTHORITY_TIERS = new Set(["primary", "high", "contextual", "candidate"]);
const CONTENT_USE = new Set(["link-only", "metadata", "excerpt", "redistributable", "repository-authored"]);
const LICENSE_STATUS = new Set(["verified", "unknown", "restricted", "repository-owned"]);

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => (seen.has(value) ? true : (seen.add(value), false)));
}

export function validateKnowledgeGraph(graph: KnowledgeGraph): string[] {
  const issues: string[] = [];
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const sourceIds = new Set(graph.sources.map((source) => source.id));

  for (const id of duplicates(graph.nodes.map((node) => node.id))) issues.push(`duplicate node id ${id}`);
  for (const id of duplicates(graph.sources.map((source) => source.id))) issues.push(`duplicate source id ${id}`);

  for (const node of graph.nodes) {
    if (!ID_PATTERN.test(node.id)) issues.push(`node id ${node.id} is invalid`);
    if (!NODE_KINDS.has(node.kind)) issues.push(`node ${node.id} has unsupported kind ${node.kind}`);
    if (!DEPTHS.has(node.depth)) issues.push(`node ${node.id} has unsupported depth ${node.depth}`);
    if (!Number.isFinite(node.estimatedHours) || node.estimatedHours < 0) issues.push(`node ${node.id} has invalid estimatedHours`);
    if (node.kind === "resource" && node.resource === undefined) issues.push(`resource node ${node.id} is missing resource details`);
    if (node.kind === "mastery-check" && node.mastery === undefined) issues.push(`mastery-check node ${node.id} is missing mastery details`);
    if (node.resource !== undefined) {
      try {
        new URL(node.resource.url);
      } catch {
        issues.push(`resource node ${node.id} has an invalid URL`);
      }
      if (!RESOURCE_FORMATS.has(node.resource.format)) issues.push(`resource node ${node.id} has unsupported format ${node.resource.format}`);
      if (!RESOURCE_ACCESS.has(node.resource.access)) issues.push(`resource node ${node.id} has unsupported access ${node.resource.access}`);
      if (node.resource.durationMinutes !== undefined && (!Number.isFinite(node.resource.durationMinutes) || node.resource.durationMinutes < 0)) {
        issues.push(`resource node ${node.id} has invalid durationMinutes`);
      }
    }
    if (node.mastery !== undefined) {
      if (!EVIDENCE_TYPES.has(node.mastery.evidenceType)) issues.push(`mastery-check node ${node.id} has unsupported evidence type ${node.mastery.evidenceType}`);
      if (!EVALUATORS.has(node.mastery.evaluation)) issues.push(`mastery-check node ${node.id} has unsupported evaluator ${node.mastery.evaluation}`);
      if (node.mastery.instructions.length === 0) issues.push(`mastery-check node ${node.id} has empty instructions`);
      if (node.mastery.diagnostic !== undefined) {
        const diagnostic = node.mastery.diagnostic;
        if (node.mastery.evaluation !== "deterministic") issues.push(`diagnostic mastery-check ${node.id} must use deterministic evaluation`);
        if (diagnostic.questions.length === 0) issues.push(`diagnostic mastery-check ${node.id} has no questions`);
        if (!Number.isFinite(diagnostic.passingScore) || diagnostic.passingScore <= 0 || diagnostic.passingScore > 1) {
          issues.push(`diagnostic mastery-check ${node.id} has invalid passingScore`);
        }
        const questionIds = new Set<string>();
        for (const question of diagnostic.questions) {
          if (questionIds.has(question.id)) issues.push(`diagnostic mastery-check ${node.id} has duplicate question ${question.id}`);
          questionIds.add(question.id);
          const optionIds = question.options.map((option) => option.id);
          if (question.options.length < 2) issues.push(`diagnostic question ${question.id} needs at least two options`);
          if (new Set(optionIds).size !== optionIds.length) issues.push(`diagnostic question ${question.id} has duplicate options`);
          if (!optionIds.includes(question.correctOptionId)) issues.push(`diagnostic question ${question.id} has an unknown correct option`);
        }
      }
    }
    for (const ref of node.sourceRefs) if (!sourceIds.has(ref)) issues.push(`node ${node.id} references missing source ${ref}`);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) issues.push(`edge ${edge.from} -> ${edge.to} has missing source node`);
    if (!nodeIds.has(edge.to)) issues.push(`edge ${edge.from} -> ${edge.to} has missing target node`);
    if (!RELATIONS.has(edge.relation)) issues.push(`edge ${edge.from} -> ${edge.to} has unsupported relation ${edge.relation}`);
    for (const ref of edge.sourceRefs ?? []) if (!sourceIds.has(ref)) issues.push(`edge ${edge.from} -> ${edge.to} references missing source ${ref}`);
  }

  for (const source of graph.sources) {
    if (!ID_PATTERN.test(source.id)) issues.push(`source id ${source.id} is invalid`);
    try {
      new URL(source.url);
    } catch {
      issues.push(`source ${source.id} has an invalid URL`);
    }
    if (Number.isNaN(Date.parse(source.retrievedAt))) issues.push(`source ${source.id} has an invalid retrievedAt timestamp`);
    if (!SOURCE_TYPES.has(source.sourceType)) issues.push(`source ${source.id} has unsupported sourceType ${source.sourceType}`);
    if (!AUTHORITY_TIERS.has(source.authorityTier)) issues.push(`source ${source.id} has unsupported authorityTier ${source.authorityTier}`);
    if (!CONTENT_USE.has(source.contentUse)) issues.push(`source ${source.id} has unsupported contentUse ${source.contentUse}`);
    if (!LICENSE_STATUS.has(source.license.status)) issues.push(`source ${source.id} has unsupported license status ${source.license.status}`);
  }

  const cycle = findRequiresCycle(graph);
  if (cycle !== undefined) issues.push(`requires cycle detected: ${cycle.join(" -> ")}`);
  return issues;
}
