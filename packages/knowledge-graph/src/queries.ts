import type { GraphEdge, GraphNode, KnowledgeGraph } from "@learn-anything/contracts";

export interface GraphIndex {
  nodes: ReadonlyMap<string, GraphNode>;
  incoming: ReadonlyMap<string, GraphEdge[]>;
  outgoing: ReadonlyMap<string, GraphEdge[]>;
}

export function createGraphIndex(graph: KnowledgeGraph): GraphIndex {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, GraphEdge[]>();
  const outgoing = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge]);
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
  }
  return { nodes, incoming, outgoing };
}

export function directPrerequisites(index: GraphIndex, capabilityId: string): string[] {
  return (index.incoming.get(capabilityId) ?? [])
    .filter((edge) => edge.relation === "requires")
    .map((edge) => edge.from)
    .sort();
}

export function prerequisiteClosure(index: GraphIndex, targetIds: readonly string[]): Set<string> {
  const closure = new Set<string>();
  const pending = [...targetIds].sort().reverse();
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined || closure.has(id)) continue;
    const node = index.nodes.get(id);
    if (node?.kind !== "capability") continue;
    closure.add(id);
    for (const prerequisite of directPrerequisites(index, id).reverse()) pending.push(prerequisite);
  }
  return closure;
}

export function topologicalSortCapabilities(index: GraphIndex, includedIds: ReadonlySet<string>): string[] {
  const indegree = new Map<string, number>();
  for (const id of includedIds) indegree.set(id, 0);
  for (const id of includedIds) {
    const count = directPrerequisites(index, id).filter((prerequisite) => includedIds.has(prerequisite)).length;
    indegree.set(id, count);
  }

  const ready = [...includedIds].filter((id) => indegree.get(id) === 0).sort();
  const result: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) break;
    result.push(id);
    const dependents = (index.outgoing.get(id) ?? [])
      .filter((edge) => edge.relation === "requires" && includedIds.has(edge.to))
      .map((edge) => edge.to)
      .sort();
    for (const dependent of dependents) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        ready.push(dependent);
        ready.sort();
      }
    }
  }
  if (result.length !== includedIds.size) throw new Error("Cannot order a graph with a requires cycle");
  return result;
}

export function findRequiresCycle(graph: KnowledgeGraph): string[] | undefined {
  const index = createGraphIndex(graph);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  function visit(id: string): string[] | undefined {
    if (visiting.has(id)) {
      const start = path.indexOf(id);
      return [...path.slice(start), id];
    }
    if (visited.has(id)) return undefined;
    visiting.add(id);
    path.push(id);
    const targets = (index.outgoing.get(id) ?? [])
      .filter((edge) => edge.relation === "requires")
      .map((edge) => edge.to)
      .sort();
    for (const target of targets) {
      const cycle = visit(target);
      if (cycle !== undefined) return cycle;
    }
    path.pop();
    visiting.delete(id);
    visited.add(id);
    return undefined;
  }

  for (const node of [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    const cycle = visit(node.id);
    if (cycle !== undefined) return cycle;
  }
  return undefined;
}
