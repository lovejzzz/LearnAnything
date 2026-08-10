import { describe, expect, test } from "vitest";
import type { KnowledgeGraph } from "@learn-anything/contracts";
import minecraftFixture from "../../../examples/minecraft-redstone.graph.json";
import philosophyFixture from "../../../examples/philosophy.graph.json";
import quantumFixture from "../../../examples/quantum-physics.graph.json";
import { resolveLearningIntake, type GoalMapDefinition, type LearningIntake } from "./index";

const definitions: GoalMapDefinition[] = [
  { graph: quantumFixture as KnowledgeGraph, defaultTargetId: "q.cap.two-path-interference", topicAliases: ["quantum mechanics"] },
  { graph: philosophyFixture as KnowledgeGraph, defaultTargetId: "p.cap.defend-revision", topicAliases: ["philosophical arguments"] },
  { graph: minecraftFixture as KnowledgeGraph, defaultTargetId: "m.cap.debug-build", topicAliases: ["redstone"] },
];

function intake(overrides: Partial<LearningIntake> = {}): LearningIntake {
  return {
    topic: "quantum physics",
    currentPosition: "I can reason with basic probability models.",
    desiredOutcome: "Explain a two-path interference experiment.",
    hoursPerWeek: 6,
    ...overrides,
  };
}

describe("learning intake resolution", () => {
  test("resolves plain-language topic and goal into a reviewed graph and capability", () => {
    const result = resolveLearningIntake(intake(), definitions);
    expect(result).toMatchObject({
      status: "resolved",
      graphId: "quantum-physics-foundations",
      targetCapabilityId: "q.cap.two-path-interference",
      confidence: "strong",
    });
    if (result.status === "resolved") expect(result.suggestedPriorCapabilityIds).toEqual(["q.cap.probability-models"]);
  });

  test("uses data-provided aliases without putting domain branches in the resolver", () => {
    const result = resolveLearningIntake(intake({
      topic: "redstone",
      currentPosition: "I know how power components work.",
      desiredOutcome: "Debug a complete build and explain the fault.",
    }), definitions);
    expect(result).toMatchObject({ status: "resolved", graphId: "minecraft-redstone-engineering", targetCapabilityId: "m.cap.debug-build" });
  });

  test("does not pretend an unknown topic has a reviewed course", () => {
    const result = resolveLearningIntake(intake({
      topic: "jazz harmony",
      currentPosition: "I can read chord symbols.",
      desiredOutcome: "Reharmonize a standard and explain my choices.",
    }), definitions);
    expect(result).toMatchObject({ status: "unmapped" });
    if (result.status === "unmapped") expect(result.availableGraphTitles).toHaveLength(3);
  });

  test("does not match generic fixture-description language as a learning domain", () => {
    const result = resolveLearningIntake(intake({
      topic: "software architecture",
      currentPosition: "I can build a small web application.",
      desiredOutcome: "Design a reliable distributed system.",
    }), definitions);
    expect(result.status).toBe("unmapped");
  });

  test("is deterministic and does not mutate its inputs", () => {
    const request = intake();
    const before = structuredClone(request);
    expect(resolveLearningIntake(request, definitions)).toEqual(resolveLearningIntake(request, definitions));
    expect(request).toEqual(before);
  });

  test("rejects missing or unbounded learner input", () => {
    expect(() => resolveLearningIntake(intake({ topic: " " }), definitions)).toThrow("topic is required");
    expect(() => resolveLearningIntake(intake({ desiredOutcome: "x".repeat(501) }), definitions)).toThrow("500-character limit");
    expect(() => resolveLearningIntake(intake({ hoursPerWeek: 0 }), definitions)).toThrow("between 1 and 40");
  });
});
