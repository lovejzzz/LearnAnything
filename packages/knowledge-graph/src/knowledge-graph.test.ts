import { describe, expect, it } from "vitest";
import philosophyFixture from "../../../examples/philosophy.graph.json";
import quantumFixture from "../../../examples/quantum-physics.graph.json";
import minecraftFixture from "../../../examples/minecraft-redstone.graph.json";
import {
  GraphValidationError,
  createGraphIndex,
  parseKnowledgeGraph,
  prerequisiteClosure,
  topologicalSortCapabilities,
} from "./index";

describe("knowledge graph", () => {
  it("computes a transitive prerequisite closure", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    const closure = prerequisiteClosure(createGraphIndex(graph), ["q.cap.two-path-interference"]);
    expect([...closure].sort()).toEqual([
      "q.cap.complex-amplitudes",
      "q.cap.probability-models",
      "q.cap.two-path-interference",
      "q.cap.wave-behavior",
    ]);
  });

  it("uses deterministic topological ordering", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    const index = createGraphIndex(graph);
    const closure = prerequisiteClosure(index, ["q.cap.two-path-interference"]);
    const first = topologicalSortCapabilities(index, closure);
    expect(topologicalSortCapabilities(index, closure)).toEqual(first);
    expect(first.indexOf("q.cap.probability-models")).toBeLessThan(first.indexOf("q.cap.complex-amplitudes"));
    expect(first.indexOf("q.cap.complex-amplitudes")).toBeLessThan(first.indexOf("q.cap.two-path-interference"));
  });

  it("rejects requires cycles", () => {
    const graph = structuredClone(quantumFixture);
    graph.edges.push({
      from: "q.cap.two-path-interference",
      to: "q.cap.probability-models",
      relation: "requires",
      rationale: "Intentional test cycle.",
      sourceRefs: ["repo.foundation"],
    });
    expect(() => parseKnowledgeGraph(graph)).toThrow(GraphValidationError);
  });

  it("does not turn alternative or support relationships into prerequisites", () => {
    const graph = parseKnowledgeGraph(philosophyFixture);
    const closure = prerequisiteClosure(createGraphIndex(graph), ["p.cap.defend-revision"]);
    expect(closure.has("p.cap.read-primary-text")).toBe(false);
    expect(closure.has("p.resource.sep")).toBe(false);
  });

  it("rejects malformed nested graph data with a validation error", () => {
    const graph = structuredClone(quantumFixture) as unknown as { nodes: Array<Record<string, unknown>> };
    const check = graph.nodes.find((node) => node.id === "q.check.interference-explanation")!;
    check.mastery = "invalid";
    expect(() => parseKnowledgeGraph(graph)).toThrow(GraphValidationError);
  });

  it.each([
    ["quantum", quantumFixture],
    ["philosophy", philosophyFixture],
    ["Redstone", minecraftFixture],
  ])("gives every %s capability a free resource, practice experience, and mastery check", (_name, fixture) => {
    const graph = parseKnowledgeGraph(fixture);
    const index = createGraphIndex(graph);
    const capabilities = graph.nodes.filter((node) => node.kind === "capability");
    for (const capability of capabilities) {
      const incoming = index.incoming.get(capability.id) ?? [];
      expect(incoming.some((edge) => edge.relation === "supports" &&
        index.nodes.get(edge.from)?.kind === "resource" && index.nodes.get(edge.from)?.resource?.access === "free"),
      `${capability.id} needs a free learning resource`).toBe(true);
      expect(incoming.some((edge) => edge.relation === "teaches" && index.nodes.get(edge.from)?.kind === "experience"),
        `${capability.id} needs a practice experience`).toBe(true);
      expect(incoming.some((edge) => edge.relation === "assesses" && index.nodes.get(edge.from)?.kind === "mastery-check"),
        `${capability.id} needs a mastery check`).toBe(true);
    }
    expect(graph.nodes.some((node) => node.kind === "mastery-check" && node.mastery?.diagnostic !== undefined)).toBe(true);
  });
});
