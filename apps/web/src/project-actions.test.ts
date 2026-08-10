import { describe, expect, it } from "vitest";
import quantumFixture from "../../../examples/quantum-physics.graph.json";
import { parseKnowledgeGraph } from "@learn-anything/knowledge-graph";
import { buildPlan, createProject, recordDiagnosticAndReplan } from "./project-actions";

describe("offline project orchestration", () => {
  it("records evidence, preserves graph data and plan history, and deterministically replans", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    const originalGraph = structuredClone(graph);
    const firstDate = "2026-08-09T12:00:00.000Z";
    const project = createProject(graph, firstDate, 10);
    const planned = buildPlan(
      project,
      graph,
      {
        description: "Explain a two-path interference experiment",
        targetCapabilityIds: ["q.cap.two-path-interference"],
        desiredDepth: "working",
        purpose: "Test the complete offline loop.",
        hoursPerWeek: 10,
      },
      ["q.cap.probability-models", "q.cap.wave-behavior", "q.cap.complex-amplitudes"],
      firstDate,
    );

    expect(planned.learnerState.evidence).toHaveLength(3);
    expect(planned.learnerState.capabilities.every((capability) => capability.status === "supported")).toBe(true);
    expect(planned.planHistory).toHaveLength(1);
    expect(planned.planHistory[0]?.steps.map((step) => step.capabilityId)).toContain("q.cap.probability-models");

    const firstPlan = planned.planHistory[0]!;
    const probabilityStep = firstPlan.steps.find((step) => step.capabilityId === "q.cap.probability-models")!;
    const diagnostic = graph.nodes.find((node) => node.id === "q.check.probability-diagnostic")!;
    const answers = Object.fromEntries(diagnostic.mastery!.diagnostic!.questions.map((question) => [question.id, question.correctOptionId]));
    const replanned = recordDiagnosticAndReplan(
      planned,
      graph,
      probabilityStep,
      diagnostic.id,
      answers,
      "2026-08-09T12:01:00.000Z",
    );

    expect(replanned.evaluation.passed).toBe(true);
    expect(replanned.project.learnerState.evidence).toHaveLength(4);
    expect(replanned.project.planHistory).toHaveLength(2);
    expect(replanned.project.planHistory[0]).toEqual(firstPlan);
    expect(replanned.project.planHistory[1]?.steps.map((step) => step.capabilityId)).not.toContain("q.cap.probability-models");
    expect(graph).toEqual(originalGraph);
  });
});
