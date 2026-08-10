import { describe, expect, it } from "vitest";
import type { EvidenceRecord, KnowledgeGraph, LearnerState, LearningGoal } from "@learn-anything/contracts";
import minecraftFixture from "../../../examples/minecraft-redstone.graph.json";
import philosophyFixture from "../../../examples/philosophy.graph.json";
import quantumFixture from "../../../examples/quantum-physics.graph.json";
import learnerFixture from "../../../examples/learner-state.json";
import { parseKnowledgeGraph } from "@learn-anything/knowledge-graph";
import { createLearnerState, recordEvidence } from "@learn-anything/learner-model";
import { planLearningPath } from "./index";

const currentDate = "2026-08-09T12:00:00.000Z";

function goal(targetCapabilityIds: string[], hoursPerWeek = 6): LearningGoal {
  return {
    description: "Test goal",
    targetCapabilityIds,
    desiredDepth: "working",
    purpose: "Exercise the offline planner.",
    hoursPerWeek,
  };
}

function plan(graph: KnowledgeGraph, target: string, hours = 6) {
  return planLearningPath({
    graph,
    learnerState: createLearnerState("learner", currentDate, hours),
    goal: goal([target], hours),
    currentDate,
    plannerVersion: "0.1.0",
  });
}

describe("path planner", () => {
  it("removes capabilities already demonstrated with current evidence", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    const result = planLearningPath({
      graph,
      learnerState: learnerFixture as LearnerState,
      goal: goal(["q.cap.two-path-interference"]),
      currentDate,
      plannerVersion: "0.1.0",
    });
    expect(result.steps.map((step) => step.capabilityId)).not.toContain("q.cap.probability-models");
    expect(result.steps.every((step) => step.reason.length > 0)).toBe(true);
  });

  it("keeps stale independent evidence in the remaining path", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    const oldDate = "2025-01-01T00:00:00.000Z";
    const evidence: EvidenceRecord = {
      id: "old.probability",
      capabilityId: "q.cap.probability-models",
      evidenceType: "diagnostic",
      evaluator: "deterministic",
      result: "independent",
      confidence: 0.9,
      conditions: "Old diagnostic.",
      recordedAt: oldDate,
      graphVersion: graph.version,
      masteryCheckId: "old.check",
    };
    const learner = recordEvidence(createLearnerState("learner", oldDate), evidence, {
      currentDate: oldDate,
      graphVersion: graph.version,
    });
    const result = planLearningPath({ graph, learnerState: learner, goal: goal(["q.cap.two-path-interference"]), currentDate, plannerVersion: "0.1.0" });
    expect(result.steps.map((step) => step.capabilityId)).toContain("q.cap.probability-models");
  });

  it("fits the next horizon within the available time", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    const result = plan(graph, "q.cap.two-path-interference", 6);
    const horizonHours = result.horizon.items.reduce((total, item) => total + item.estimatedHours, 0);
    expect(horizonHours).toBeLessThanOrEqual(result.horizon.budgetHours);
  });

  it("returns a partial learning action instead of an empty horizon when the capability estimate exceeds the budget", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    const result = plan(graph, "q.cap.two-path-interference", 0.2);
    expect(result.horizon.items).toHaveLength(1);
    expect(result.horizon.items[0]).toMatchObject({ kind: "learn", estimatedHours: 0.2, partial: true });
  });

  it("returns byte-for-byte identical output for identical inputs", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    expect(plan(graph, "q.cap.two-path-interference")).toEqual(plan(graph, "q.cap.two-path-interference"));
  });

  it("includes only targets and their prerequisite closure while attaching graph resources and checks", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    const result = plan(graph, "q.cap.two-path-interference", 30);
    const allowed = new Set([
      "q.cap.probability-models",
      "q.cap.wave-behavior",
      "q.cap.complex-amplitudes",
      "q.cap.two-path-interference",
    ]);
    expect(result.steps.every((step) => allowed.has(step.capabilityId))).toBe(true);
    const target = result.steps.find((step) => step.capabilityId === "q.cap.two-path-interference");
    expect(target?.resourceIds).toEqual(["q.resource.phet"]);
    expect(target?.experienceIds).toEqual(["q.experience.interference-predictions"]);
    expect(target?.masteryCheckIds).toEqual(["q.check.interference-explanation"]);
  });

  it("reports unresolved targets without mutating any planner input", () => {
    const graph = parseKnowledgeGraph(quantumFixture);
    const learnerState = createLearnerState("learner", currentDate);
    const learningGoal = goal(["q.cap.missing"]);
    const before = structuredClone({ graph, learnerState, learningGoal });
    const result = planLearningPath({ graph, learnerState, goal: learningGoal, currentDate, plannerVersion: "0.1.0" });
    expect(result.blockedTargets).toEqual([{
      capabilityId: "q.cap.missing",
      reason: "Target does not exist in this graph version.",
    }]);
    expect({ graph, learnerState, learningGoal }).toEqual(before);
  });

  it.each([
    ["quantum", quantumFixture, "q.cap.two-path-interference"],
    ["philosophy", philosophyFixture, "p.cap.defend-revision"],
    ["Redstone", minecraftFixture, "m.cap.debug-build"],
  ])("plans the %s fixture with the same general code", (_name, fixture, target) => {
    const result = plan(parseKnowledgeGraph(fixture), target);
    expect(result.blockedTargets).toEqual([]);
    expect(result.steps.at(-1)?.capabilityId).toBe(target);
    expect(result.steps.every((step) => step.reason.length > 0)).toBe(true);
  });

  it.each([
    ["quantum", quantumFixture, "q.cap.two-path-interference"],
    ["philosophy", philosophyFixture, "p.cap.defend-revision"],
    ["Redstone", minecraftFixture, "m.cap.debug-build"],
  ])("gives every reachable %s horizon item a learn-practice-demonstrate path", (_name, fixture, target) => {
    const result = plan(parseKnowledgeGraph(fixture), target, 30);
    expect(result.horizon.items.length).toBeGreaterThan(0);
    for (const item of result.horizon.items) {
      const step = result.steps.find((candidate) => candidate.capabilityId === item.capabilityId);
      expect(step?.resourceIds.length, `${item.capabilityId} needs learning`).toBeGreaterThan(0);
      expect(step?.experienceIds.length, `${item.capabilityId} needs practice`).toBeGreaterThan(0);
      expect(step?.masteryCheckIds.length, `${item.capabilityId} needs demonstration`).toBeGreaterThan(0);
    }
    const firstCapabilityId = result.horizon.items[0]?.capabilityId;
    expect(result.horizon.items.filter((item) => item.capabilityId === firstCapabilityId).map((item) => item.kind)).toEqual([
      "learn",
      "practice",
      "demonstrate",
    ]);
  });
});
