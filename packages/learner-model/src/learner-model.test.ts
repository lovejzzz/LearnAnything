import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@learn-anything/contracts";
import { createLearnerState, deriveCapabilityStatus, recordEvidence } from "./index";

const currentDate = "2026-08-09T12:00:00.000Z";

function evidence(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    id: "evidence.test",
    capabilityId: "cap.test",
    evidenceType: "diagnostic",
    evaluator: "deterministic",
    result: "independent",
    confidence: 0.9,
    conditions: "Completed without help.",
    recordedAt: currentDate,
    graphVersion: "0.1.0",
    masteryCheckId: "check.test",
    ...overrides,
  };
}

describe("learner model", () => {
  it("does not count weak evidence as independent mastery", () => {
    const learner = recordEvidence(createLearnerState("learner", currentDate), evidence({ confidence: 0.4 }), {
      currentDate,
      graphVersion: "0.1.0",
    });
    expect(deriveCapabilityStatus(learner, "cap.test", { currentDate, graphVersion: "0.1.0" })).toBe("supported");
  });

  it("marks old evidence stale", () => {
    const learner = recordEvidence(
      createLearnerState("learner", "2025-01-01T00:00:00.000Z"),
      evidence({ recordedAt: "2025-01-01T00:00:00.000Z" }),
      { currentDate: "2025-01-01T00:00:00.000Z", graphVersion: "0.1.0" },
    );
    expect(deriveCapabilityStatus(learner, "cap.test", { currentDate, graphVersion: "0.1.0" })).toBe("stale");
  });

  it("requires evidence even if a stored status claims independence", () => {
    const learner = createLearnerState("learner", currentDate);
    learner.capabilities.push({ capabilityId: "cap.test", status: "independent", updatedAt: currentDate });
    expect(deriveCapabilityStatus(learner, "cap.test", { currentDate })).toBe("unseen");
  });

  it("does not expose a resource-open transition as mastery", () => {
    const learner = createLearnerState("learner", currentDate);
    expect(learner.evidence).toEqual([]);
    expect(deriveCapabilityStatus(learner, "cap.test", { currentDate })).toBe("unseen");
  });

  it("rejects independent performance claims without an artifact reference", () => {
    const learner = createLearnerState("learner", currentDate);
    expect(() => recordEvidence(learner, evidence({
      evidenceType: "build",
      evaluator: "self",
    }), { currentDate })).toThrow("requires an artifact reference");
  });

  it("rejects peer claims without an evaluator reference", () => {
    const learner = createLearnerState("learner", currentDate);
    expect(() => recordEvidence(learner, evidence({
      evidenceType: "analysis",
      evaluator: "peer",
      artifactRef: "essay.md",
    }), { currentDate })).toThrow("peer evidence requires an evaluator reference");
  });
});
