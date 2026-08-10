import { describe, expect, it } from "vitest";
import type { LearningProject } from "@learn-anything/contracts";
import { appendActivity, InMemoryStorage, ProjectStore } from "./index";

describe("project store", () => {
  it("round-trips a complete project export", async () => {
    const store = new ProjectStore(new InMemoryStorage());
    const project: LearningProject = {
      schemaVersion: "0.1.0",
      id: "project.test",
      activeGraphId: "quantum-physics-foundations",
      learnerState: {
        schemaVersion: "0.1.0",
        id: "learner.test",
        createdAt: "2026-08-09T12:00:00.000Z",
        updatedAt: "2026-08-09T12:00:00.000Z",
        preferences: { hoursPerWeek: 6, language: "en", reducedMotion: false },
        capabilities: [],
        evidence: [],
      },
      goals: [],
      planHistory: [],
      activityHistory: [],
    };
    const restored = await store.import(store.export(project));
    expect(restored).toEqual(project);
    expect(await store.load()).toEqual(project);
  });

  it("records resource opens as activity without upgrading mastery", () => {
    const learnerState: LearningProject["learnerState"] = {
      schemaVersion: "0.1.0",
      id: "learner.test",
      createdAt: "2026-08-09T12:00:00.000Z",
      updatedAt: "2026-08-09T12:00:00.000Z",
      preferences: { hoursPerWeek: 6, language: "en", reducedMotion: false },
      capabilities: [],
      evidence: [],
    };
    const project: LearningProject = {
      schemaVersion: "0.1.0",
      id: "project.test",
      activeGraphId: "quantum-physics-foundations",
      learnerState,
      goals: [],
      planHistory: [],
      activityHistory: [],
    };
    const updated = appendActivity(project, {
      id: "activity.resource-open",
      type: "resource-open",
      resourceId: "q.resource.phet",
      recordedAt: "2026-08-09T12:01:00.000Z",
    });
    expect(updated.activityHistory).toHaveLength(1);
    expect(updated.learnerState).toBe(learnerState);
    expect(updated.learnerState.evidence).toEqual([]);
  });

  it("rejects malformed nested data at the import boundary", async () => {
    const store = new ProjectStore(new InMemoryStorage());
    const malformed = JSON.stringify({
      schemaVersion: "0.1.0",
      id: "project.test",
      activeGraphId: "quantum-physics-foundations",
      learnerState: { schemaVersion: "0.1.0", evidence: "not-an-array" },
      goals: [],
      planHistory: [],
      activityHistory: [],
    });
    await expect(store.import(malformed)).rejects.toThrow("does not match schema version 0.1.0");
    expect(await store.load()).toBeUndefined();
  });

  it("migrates saved 0.1 learning paths to the 0.2 action contract", async () => {
    const store = new ProjectStore(new InMemoryStorage());
    const restored = await store.import(JSON.stringify({
      schemaVersion: "0.1.0",
      id: "project.legacy",
      activeGraphId: "quantum-physics-foundations",
      learnerState: {
        schemaVersion: "0.1.0",
        id: "learner.legacy",
        createdAt: "2026-08-09T12:00:00.000Z",
        updatedAt: "2026-08-09T12:00:00.000Z",
        preferences: { hoursPerWeek: 6, language: "en", reducedMotion: false },
        capabilities: [],
        evidence: [],
      },
      goals: [],
      planHistory: [{
        schemaVersion: "0.1.0",
        id: "path.legacy",
        plannerVersion: "0.1.0",
        graphId: "quantum-physics-foundations",
        graphVersion: "0.1.0",
        learnerStateId: "learner.legacy",
        goal: {
          description: "Legacy goal",
          targetCapabilityIds: ["q.cap.two-path-interference"],
          desiredDepth: "working",
          purpose: "Verify migration.",
          hoursPerWeek: 6,
        },
        generatedAt: "2026-08-09T12:00:00.000Z",
        steps: [],
        horizon: { days: 7, budgetHours: 6, capabilityIds: [] },
        blockedTargets: [],
      }],
      activityHistory: [],
    }));
    expect(restored.planHistory[0]).toMatchObject({
      schemaVersion: "0.2.0",
      steps: [],
      horizon: { items: [] },
    });
  });
});
