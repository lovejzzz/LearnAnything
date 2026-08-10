import { describe, expect, it } from "vitest";
import type { GraphNode } from "@learn-anything/contracts";
import { createDiagnosticEvidence, evaluateDiagnostic } from "./index";

const check: GraphNode = {
  id: "test.check.diagnostic",
  kind: "mastery-check",
  title: "Short diagnostic",
  summary: "Two representative questions.",
  depth: "foundation",
  estimatedHours: 0.25,
  sourceRefs: ["repo.foundation"],
  mastery: {
    evidenceType: "solution",
    instructions: "Answer both questions without hints.",
    evaluation: "deterministic",
    diagnostic: {
      passingScore: 1,
      questions: [
        { id: "question.one", prompt: "One?", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], correctOptionId: "a" },
        { id: "question.two", prompt: "Two?", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], correctOptionId: "b" },
      ],
    },
  },
};

describe("deterministic diagnostics", () => {
  it("requires every answer and the declared passing score", () => {
    expect(evaluateDiagnostic(check, { "question.one": "a" }).passed).toBe(false);
    expect(evaluateDiagnostic(check, { "question.one": "a", "question.two": "a" }).passed).toBe(false);
    expect(evaluateDiagnostic(check, { "question.one": "a", "question.two": "b" })).toMatchObject({
      passed: true,
      score: 1,
      correctAnswers: 2,
    });
  });

  it("creates independent evidence only for a passing diagnostic", () => {
    const passed = createDiagnosticEvidence({
      check,
      capabilityId: "test.capability",
      answers: { "question.one": "a", "question.two": "b" },
      evidenceId: "evidence.pass",
      recordedAt: "2026-08-10T12:00:00.000Z",
      graphVersion: "0.2.0",
    });
    const failed = createDiagnosticEvidence({
      check,
      capabilityId: "test.capability",
      answers: { "question.one": "b", "question.two": "b" },
      evidenceId: "evidence.fail",
      recordedAt: "2026-08-10T12:01:00.000Z",
      graphVersion: "0.2.0",
    });
    expect(passed.evidence.result).toBe("independent");
    expect(failed.evidence.result).toBe("insufficient");
  });
});
