import type { KnowledgeGraph } from "@learn-anything/contracts";
import { parseKnowledgeGraph } from "@learn-anything/knowledge-graph";
import minecraftFixture from "../../../examples/minecraft-redstone.graph.json";
import philosophyFixture from "../../../examples/philosophy.graph.json";
import quantumFixture from "../../../examples/quantum-physics.graph.json";

export interface DomainDefinition {
  graph: KnowledgeGraph;
  defaultTargetId: string;
}

export const domains: DomainDefinition[] = [
  { graph: parseKnowledgeGraph(quantumFixture), defaultTargetId: "q.cap.two-path-interference" },
  { graph: parseKnowledgeGraph(philosophyFixture), defaultTargetId: "p.cap.defend-revision" },
  { graph: parseKnowledgeGraph(minecraftFixture), defaultTargetId: "m.cap.debug-build" },
];

export function domainById(id: string): DomainDefinition {
  return domains.find((domain) => domain.graph.id === id) ?? domains[0]!;
}
