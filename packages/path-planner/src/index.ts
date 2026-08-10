import type {
  KnowledgeGraph,
  HorizonAction,
  LearnerState,
  LearningGoal,
  LearningPath,
  PathStep,
} from "@learn-anything/contracts";
import {
  createGraphIndex,
  directPrerequisites,
  prerequisiteClosure,
  topologicalSortCapabilities,
} from "@learn-anything/knowledge-graph";
import { deriveCapabilityStatus, isCurrentlyDemonstrated } from "@learn-anything/learner-model";

export interface PlannerInput {
  graph: KnowledgeGraph;
  learnerState: LearnerState;
  goal: LearningGoal;
  currentDate: string;
  plannerVersion: string;
  horizonDays?: number;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function stableDigest(value: unknown): string {
  const source = canonicalize(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function planLearningPath(input: PlannerInput): LearningPath {
  const { graph, learnerState, goal, currentDate, plannerVersion } = input;
  if (!Number.isFinite(goal.hoursPerWeek) || goal.hoursPerWeek <= 0) throw new Error("hoursPerWeek must be positive");
  if (Number.isNaN(Date.parse(currentDate))) throw new Error("currentDate must be an ISO date-time");
  const horizonDays = input.horizonDays ?? 7;
  if (!Number.isInteger(horizonDays) || horizonDays <= 0) throw new Error("horizonDays must be a positive integer");

  const index = createGraphIndex(graph);
  const targetIds = [...new Set(goal.targetCapabilityIds)].sort();
  const blockedTargets: LearningPath["blockedTargets"] = [];
  const validTargets = targetIds.filter((targetId) => {
    const target = index.nodes.get(targetId);
    if (target?.kind === "capability") return true;
    blockedTargets.push({
      capabilityId: targetId,
      reason: target === undefined ? "Target does not exist in this graph version." : "Target is not a capability.",
    });
    return false;
  });

  const closure = prerequisiteClosure(index, validTargets);
  const remaining = new Set(
    [...closure].filter((capabilityId) => {
      const status = deriveCapabilityStatus(learnerState, capabilityId, {
        currentDate,
        graphVersion: graph.version,
      });
      return !isCurrentlyDemonstrated(status);
    }),
  );
  const ordered = topologicalSortCapabilities(index, remaining);
  const stages = new Map<string, number>();
  const targetSet = new Set(validTargets);

  const steps: PathStep[] = ordered.map((capabilityId) => {
    const node = index.nodes.get(capabilityId);
    if (node === undefined) throw new Error(`Missing indexed node ${capabilityId}`);
    const prerequisites = directPrerequisites(index, capabilityId);
    const activePrerequisiteStages = prerequisites
      .filter((id) => remaining.has(id))
      .map((id) => stages.get(id) ?? 0);
    const stage = activePrerequisiteStages.length === 0 ? 1 : Math.max(...activePrerequisiteStages) + 1;
    stages.set(capabilityId, stage);

    const incoming = index.incoming.get(capabilityId) ?? [];
    const resourceIds = incoming
      .filter((edge) => edge.relation === "supports" && index.nodes.get(edge.from)?.kind === "resource")
      .map((edge) => edge.from)
      .sort();
    const masteryCheckIds = incoming
      .filter((edge) => edge.relation === "assesses" && index.nodes.get(edge.from)?.kind === "mastery-check")
      .map((edge) => edge.from)
      .sort();
    const experienceIds = incoming
      .filter((edge) => edge.relation === "teaches" && index.nodes.get(edge.from)?.kind === "experience")
      .map((edge) => edge.from)
      .sort();

    return {
      capabilityId,
      stage,
      estimatedHours: node.estimatedHours,
      reason: targetSet.has(capabilityId)
        ? "This is an approved target capability and has not yet been demonstrated independently."
        : `This capability is in the prerequisite closure of ${validTargets.join(", ")} and has not yet been demonstrated independently.`,
      prerequisiteIds: prerequisites,
      resourceIds,
      experienceIds,
      masteryCheckIds,
    };
  });

  const budgetHours = goal.hoursPerWeek * (horizonDays / 7);
  const frontierStage = steps[0]?.stage;
  const availableActions: HorizonAction[] = steps
    .filter((step) => step.stage === frontierStage)
    .flatMap((step) => {
    const resourceId = step.resourceIds[0];
    const experienceId = step.experienceIds[0];
    const masteryCheckId = step.masteryCheckIds[0];
    const actions: HorizonAction[] = [];
    if (resourceId !== undefined) {
      const resource = index.nodes.get(resourceId);
      const hours = resource?.resource?.durationMinutes === undefined ? 0.75 : resource.resource.durationMinutes / 60;
      actions.push({
        id: `action.${step.capabilityId}.learn.${resourceId}`,
        capabilityId: step.capabilityId,
        kind: "learn",
        nodeId: resourceId,
        estimatedHours: Math.max(0.25, hours),
        reason: "Use the attached free resource to establish the model and vocabulary needed for practice.",
        partial: false,
      });
    }
    if (experienceId !== undefined) {
      const experience = index.nodes.get(experienceId);
      actions.push({
        id: `action.${step.capabilityId}.practice.${experienceId}`,
        capabilityId: step.capabilityId,
        kind: "practice",
        nodeId: experienceId,
        estimatedHours: Math.max(0.25, experience?.estimatedHours ?? 0.75),
        reason: "Complete the attached experience to practice the capability before assessment.",
        partial: false,
      });
    }
    if (masteryCheckId !== undefined) {
      const masteryCheck = index.nodes.get(masteryCheckId);
      actions.push({
        id: `action.${step.capabilityId}.demonstrate.${masteryCheckId}`,
        capabilityId: step.capabilityId,
        kind: "demonstrate",
        nodeId: masteryCheckId,
        estimatedHours: Math.max(0.25, masteryCheck?.estimatedHours ?? 0.75),
        reason: "Produce the declared evidence so the learner model can justify replanning.",
        partial: false,
      });
    }
    return actions;
    });

  const horizonItems: HorizonAction[] = [];
  let allocatedHours = 0;
  for (const action of availableActions) {
    const remainingHours = budgetHours - allocatedHours;
    if (remainingHours <= 0) break;
    if (action.estimatedHours <= remainingHours) {
      horizonItems.push(action);
      allocatedHours += action.estimatedHours;
      continue;
    }
    if (horizonItems.length === 0) {
      horizonItems.push({
        ...action,
        estimatedHours: remainingHours,
        reason: `${action.reason} Begin with the available time and continue this action in the next horizon.`,
        partial: true,
      });
    }
    break;
  }
  const horizonIds = [...new Set(horizonItems.map((item) => item.capabilityId))];

  const identity = {
    plannerVersion,
    graphId: graph.id,
    graphVersion: graph.version,
    learnerStateId: learnerState.id,
    learnerUpdatedAt: learnerState.updatedAt,
    evidenceIds: learnerState.evidence.map((record) => record.id).sort(),
    goal,
    currentDate,
    steps,
    horizon: { days: horizonDays, budgetHours, capabilityIds: horizonIds, items: horizonItems },
    blockedTargets,
  };

  return {
    schemaVersion: "0.2.0",
    id: `path.${stableDigest(identity)}`,
    plannerVersion,
    graphId: graph.id,
    graphVersion: graph.version,
    learnerStateId: learnerState.id,
    goal,
    generatedAt: currentDate,
    steps,
    horizon: { days: horizonDays, budgetHours, capabilityIds: horizonIds, items: horizonItems },
    blockedTargets,
  };
}
