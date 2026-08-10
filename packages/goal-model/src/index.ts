import type { GraphNode, KnowledgeGraph } from "@learn-anything/contracts";

export interface LearningIntake {
  topic: string;
  currentPosition: string;
  desiredOutcome: string;
  hoursPerWeek: number;
}

export interface GoalMapDefinition {
  graph: KnowledgeGraph;
  defaultTargetId: string;
  topicAliases?: string[];
}

export interface ResolvedLearningIntake {
  status: "resolved";
  intake: LearningIntake;
  graphId: string;
  graphTitle: string;
  targetCapabilityId: string;
  targetCapabilityTitle: string;
  suggestedPriorCapabilityIds: string[];
  matchedTopicTerms: string[];
  confidence: "strong" | "tentative";
  clarification: string | null;
}

export interface UnmappedLearningIntake {
  status: "unmapped";
  intake: LearningIntake;
  availableGraphTitles: string[];
  reason: string;
}

export type LearningIntakeResolution = ResolvedLearningIntake | UnmappedLearningIntake;

const limits = {
  topic: 120,
  currentPosition: 1_000,
  desiredOutcome: 500,
} as const;

const stopWords = new Set([
  "a", "about", "am", "an", "and", "at", "be", "become", "can", "do", "for", "from", "how", "i", "in", "is", "it",
  "learn", "learning", "me", "my", "of", "on", "or", "the", "this", "to", "understand", "want", "with",
]);

function normalizeText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value: string): string[] {
  return [...new Set(normalizeText(value).split(" ").filter((token) => token.length > 1 && !stopWords.has(token)))];
}

function capabilityNodes(graph: KnowledgeGraph): GraphNode[] {
  return graph.nodes.filter((node) => node.kind === "capability");
}

function searchableCapability(node: GraphNode): Set<string> {
  return new Set(tokens([node.title, node.summary, ...(node.tags ?? [])].join(" ")));
}

function validateIntake(intake: LearningIntake): LearningIntake {
  const normalized = {
    topic: intake.topic.trim(),
    currentPosition: intake.currentPosition.trim(),
    desiredOutcome: intake.desiredOutcome.trim(),
    hoursPerWeek: intake.hoursPerWeek,
  };
  for (const field of ["topic", "currentPosition", "desiredOutcome"] as const) {
    if (normalized[field].length === 0) throw new Error(`${field} is required`);
    if (normalized[field].length > limits[field]) throw new Error(`${field} exceeds its ${limits[field]}-character limit`);
  }
  if (!Number.isInteger(normalized.hoursPerWeek) || normalized.hoursPerWeek < 1 || normalized.hoursPerWeek > 40) {
    throw new Error("hoursPerWeek must be an integer between 1 and 40");
  }
  return normalized;
}

function domainMatch(definition: GoalMapDefinition, topic: string, desiredOutcome: string) {
  const topicTerms = tokens(topic);
  const titleTerms = new Set(tokens(definition.graph.title));
  const aliases = (definition.topicAliases ?? []).map(normalizeText);
  const normalizedTopic = normalizeText(topic);
  const exactAlias = [normalizeText(definition.graph.title), ...aliases].some(
    (alias) => alias === normalizedTopic || normalizedTopic.includes(alias),
  );
  const graphTerms = new Set(tokens([
    definition.graph.title,
    ...aliases,
    ...capabilityNodes(definition.graph).flatMap((node) => [node.title, node.summary, ...(node.tags ?? [])]),
  ].join(" ")));
  const matchedTopicTerms = topicTerms.filter((term) => graphTerms.has(term));
  const titleMatches = matchedTopicTerms.filter((term) => titleTerms.has(term)).length;
  const outcomeTerms = tokens(desiredOutcome);
  const outcomeMatches = outcomeTerms.filter((term) => graphTerms.has(term)).length;
  const score = (exactAlias ? 100 : 0) + titleMatches * 12 + matchedTopicTerms.length * 5 + outcomeMatches;
  return { score, exactAlias, matchedTopicTerms };
}

function targetMatch(graph: KnowledgeGraph, desiredOutcome: string, defaultTargetId: string) {
  const outcomeTerms = tokens(desiredOutcome);
  const ranked = capabilityNodes(graph).map((node) => {
    const titleTerms = new Set(tokens(node.title));
    const allTerms = searchableCapability(node);
    const titleMatches = outcomeTerms.filter((term) => titleTerms.has(term)).length;
    const allMatches = outcomeTerms.filter((term) => allTerms.has(term)).length;
    return { node, score: titleMatches * 6 + allMatches * 2 };
  }).sort((left, right) => right.score - left.score || left.node.id.localeCompare(right.node.id));
  const best = ranked[0];
  const fallback = graph.nodes.find((node) => node.id === defaultTargetId && node.kind === "capability");
  if (best !== undefined && best.score > 0) return { node: best.node, inferred: true };
  if (fallback === undefined) throw new Error(`Default target ${defaultTargetId} is not a capability in ${graph.id}`);
  return { node: fallback, inferred: false };
}

function priorSuggestions(graph: KnowledgeGraph, currentPosition: string, targetCapabilityId: string): string[] {
  const currentTerms = tokens(currentPosition);
  const ranked = capabilityNodes(graph).filter((node) => node.id !== targetCapabilityId).map((node) => ({
    id: node.id,
    score: currentTerms.filter((term) => searchableCapability(node).has(term)).length,
  })).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  const strongestScore = ranked[0]?.score ?? 0;
  if (strongestScore < 2) return [];
  return ranked.filter((candidate) => candidate.score === strongestScore).map((candidate) => candidate.id);
}

export function resolveLearningIntake(intake: LearningIntake, definitions: GoalMapDefinition[]): LearningIntakeResolution {
  const normalized = validateIntake(intake);
  if (definitions.length === 0) throw new Error("At least one reviewed graph is required");
  const ranked = definitions.map((definition) => ({ definition, ...domainMatch(definition, normalized.topic, normalized.desiredOutcome) }))
    .sort((left, right) => right.score - left.score || left.definition.graph.id.localeCompare(right.definition.graph.id));
  const best = ranked[0]!;
  if (best.score === 0 || best.matchedTopicTerms.length === 0) {
    return {
      status: "unmapped",
      intake: normalized,
      availableGraphTitles: definitions.map((definition) => definition.graph.title).sort(),
      reason: "No reviewed knowledge map matches the topic yet. LearnAnything did not invent a course or treat an AI guess as authority.",
    };
  }
  const target = targetMatch(best.definition.graph, normalized.desiredOutcome, best.definition.defaultTargetId);
  return {
    status: "resolved",
    intake: normalized,
    graphId: best.definition.graph.id,
    graphTitle: best.definition.graph.title,
    targetCapabilityId: target.node.id,
    targetCapabilityTitle: target.node.title,
    suggestedPriorCapabilityIds: priorSuggestions(best.definition.graph, normalized.currentPosition, target.node.id),
    matchedTopicTerms: best.matchedTopicTerms.sort(),
    confidence: best.exactAlias || best.matchedTopicTerms.length >= 2 ? "strong" : "tentative",
    clarification: target.inferred ? null : "The desired outcome did not match one capability clearly, so the map's default destination is selected for confirmation.",
  };
}
