import type { GraphEdge, GraphNode, GraphSource, KnowledgeGraph } from "@learn-anything/contracts";
import { validateKnowledgeGraph } from "./validate";

export class GraphValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Knowledge graph is invalid:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "GraphValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
}

function hasDiagnosticShape(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, ["questions", "passingScore"]) ||
    !Array.isArray(value.questions) || typeof value.passingScore !== "number") return false;
  return value.questions.every((question) => isRecord(question) &&
    hasOnlyKeys(question, ["id", "prompt", "options", "correctOptionId"]) &&
    typeof question.id === "string" && typeof question.prompt === "string" &&
    typeof question.correctOptionId === "string" && Array.isArray(question.options) &&
    question.options.every((option) => isRecord(option) && hasOnlyKeys(option, ["id", "label"]) &&
      typeof option.id === "string" && typeof option.label === "string"));
}

function hasNodeShape(value: unknown): value is GraphNode {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["id", "kind", "title", "summary", "depth", "estimatedHours", "sourceRefs", "tags", "resource", "mastery"])) return false;
  const resourceValid = value.resource === undefined || (isRecord(value.resource) &&
    hasOnlyKeys(value.resource, ["url", "format", "access", "durationMinutes"]) &&
    typeof value.resource.url === "string" && typeof value.resource.format === "string" &&
    typeof value.resource.access === "string" &&
    (value.resource.durationMinutes === undefined || typeof value.resource.durationMinutes === "number"));
  const masteryValid = value.mastery === undefined || (isRecord(value.mastery) &&
    hasOnlyKeys(value.mastery, ["evidenceType", "instructions", "evaluation", "diagnostic"]) &&
    typeof value.mastery.evidenceType === "string" && typeof value.mastery.instructions === "string" &&
    typeof value.mastery.evaluation === "string" &&
    (value.mastery.diagnostic === undefined || hasDiagnosticShape(value.mastery.diagnostic)));
  return (
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    typeof value.depth === "string" &&
    typeof value.estimatedHours === "number" &&
    isStringArray(value.sourceRefs) &&
    (value.tags === undefined || isStringArray(value.tags)) &&
    resourceValid && masteryValid
  );
}

function hasEdgeShape(value: unknown): value is GraphEdge {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["from", "to", "relation", "rationale", "sourceRefs"])) return false;
  return (
    typeof value.from === "string" &&
    typeof value.to === "string" &&
    typeof value.relation === "string" &&
    typeof value.rationale === "string" &&
    (value.sourceRefs === undefined || isStringArray(value.sourceRefs))
  );
}

function hasSourceShape(value: unknown): value is GraphSource {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["id", "title", "url", "publisher", "sourceType", "retrievedAt", "authorityTier", "contentUse", "license"]) ||
    !isRecord(value.license) ||
    !hasOnlyKeys(value.license, ["status", "identifier", "attributionRequired", "redistributionAllowed", "derivativesAllowed", "notes"])) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.publisher === "string" &&
    typeof value.sourceType === "string" &&
    typeof value.retrievedAt === "string" &&
    typeof value.authorityTier === "string" &&
    typeof value.contentUse === "string" &&
    typeof value.license.status === "string" && typeof value.license.identifier === "string" &&
    typeof value.license.attributionRequired === "boolean" && typeof value.license.redistributionAllowed === "boolean" &&
    typeof value.license.derivativesAllowed === "boolean" && typeof value.license.notes === "string"
  );
}

function shapeIssues(value: unknown): string[] {
  if (!isRecord(value)) return ["document must be a JSON object"];
  const issues: string[] = [];
  if (!hasOnlyKeys(value, ["schemaVersion", "id", "version", "title", "description", "language", "license", "nodes", "edges", "sources"])) {
    issues.push("document contains unsupported properties");
  }
  if (value.schemaVersion !== "0.1.0") issues.push("schemaVersion must be 0.1.0");
  for (const key of ["id", "version", "title", "description", "language"] as const) {
    if (typeof value[key] !== "string" || value[key].length === 0) issues.push(`${key} must be a non-empty string`);
  }
  if (!Array.isArray(value.nodes)) issues.push("nodes must be an array");
  else value.nodes.forEach((node, index) => {
    if (!hasNodeShape(node)) issues.push(`nodes[${index}] does not match the node contract`);
  });
  if (!Array.isArray(value.edges)) issues.push("edges must be an array");
  else value.edges.forEach((edge, index) => {
    if (!hasEdgeShape(edge)) issues.push(`edges[${index}] does not match the edge contract`);
  });
  if (!Array.isArray(value.sources)) issues.push("sources must be an array");
  else value.sources.forEach((source, index) => {
    if (!hasSourceShape(source)) issues.push(`sources[${index}] does not match the source contract`);
  });
  return issues;
}

export function parseKnowledgeGraph(input: string | unknown): KnowledgeGraph {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch (error) {
      throw new GraphValidationError([`invalid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`]);
    }
  }

  const issues = shapeIssues(value);
  if (issues.length > 0) throw new GraphValidationError(issues);
  const graph = value as KnowledgeGraph;
  const invariantIssues = validateKnowledgeGraph(graph);
  if (invariantIssues.length > 0) throw new GraphValidationError(invariantIssues);
  return graph;
}
