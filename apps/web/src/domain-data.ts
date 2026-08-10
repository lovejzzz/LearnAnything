import type { KnowledgeGraph } from "@learn-anything/contracts";
import type { GoalMapDefinition } from "@learn-anything/goal-model";
import { parseKnowledgeGraph } from "@learn-anything/knowledge-graph";
import minecraftFixture from "../../../examples/minecraft-redstone.graph.json";
import philosophyFixture from "../../../examples/philosophy.graph.json";
import quantumFixture from "../../../examples/quantum-physics.graph.json";

export interface DomainDefinition extends GoalMapDefinition {
  graph: KnowledgeGraph;
}

export const domains: DomainDefinition[] = [
  { graph: parseKnowledgeGraph(quantumFixture), defaultTargetId: "q.cap.two-path-interference", topicAliases: ["quantum mechanics", "quantum science"] },
  { graph: parseKnowledgeGraph(philosophyFixture), defaultTargetId: "p.cap.defend-revision", topicAliases: ["philosophical arguments", "argumentation"] },
  { graph: parseKnowledgeGraph(minecraftFixture), defaultTargetId: "m.cap.debug-build", topicAliases: ["redstone", "minecraft circuits"] },
];

export function domainById(id: string): DomainDefinition {
  return domains.find((domain) => domain.graph.id === id) ?? domains[0]!;
}
