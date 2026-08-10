import type {
  EvidenceRecord,
  KnowledgeGraph,
  LearningGoal,
  LearningProject,
  PathStep,
} from "@learn-anything/contracts";
import { createLearnerState, recordEvidence } from "@learn-anything/learner-model";
import { createDiagnosticEvidence, type DiagnosticAnswers, type DiagnosticEvaluation } from "@learn-anything/mastery";
import { planLearningPath } from "@learn-anything/path-planner";

export const PLANNER_VERSION = "0.2.0";

export interface MasterySubmission {
  artifactRef: string;
  evaluatorRef?: string;
  attested: boolean;
}

export function createProject(graph: KnowledgeGraph, recordedAt: string, hoursPerWeek = 6): LearningProject {
  return {
    schemaVersion: "0.1.0",
    id: "local.learning-project",
    activeGraphId: graph.id,
    learnerState: createLearnerState("local.learner", recordedAt, hoursPerWeek),
    goals: [],
    planHistory: [],
    activityHistory: [],
  };
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9.-]/g, "-");
}

export function buildPlan(
  project: LearningProject,
  graph: KnowledgeGraph,
  goal: LearningGoal,
  priorCapabilityIds: string[],
  recordedAt: string,
): LearningProject {
  let learnerState = {
    ...project.learnerState,
    preferences: { ...project.learnerState.preferences, hoursPerWeek: goal.hoursPerWeek },
  };
  for (const capabilityId of [...priorCapabilityIds].sort()) {
    const alreadyRecorded = learnerState.evidence.some(
      (evidence) => evidence.capabilityId === capabilityId && evidence.masteryCheckId === `prior.${capabilityId}`,
    );
    if (alreadyRecorded) continue;
    learnerState = recordEvidence(
      learnerState,
      {
        id: `evidence.prior.${safeId(capabilityId)}.${safeId(recordedAt)}`,
        capabilityId,
        evidenceType: "diagnostic",
        evaluator: "self",
        result: "supported",
        confidence: 0.7,
        conditions: "Learner self-reported prior familiarity; independent mastery still requires diagnostic or performance evidence.",
        recordedAt,
        graphVersion: graph.version,
        masteryCheckId: `prior.${capabilityId}`,
      },
      { currentDate: recordedAt, graphVersion: graph.version },
    );
  }

  const nextPlan = planLearningPath({
    graph,
    learnerState,
    goal,
    currentDate: recordedAt,
    plannerVersion: PLANNER_VERSION,
  });
  return {
    ...project,
    activeGraphId: graph.id,
    learnerState,
    goals: [...project.goals, goal],
    planHistory: [...project.planHistory, nextPlan],
  };
}

export function recordMasteryAndReplan(
  project: LearningProject,
  graph: KnowledgeGraph,
  step: PathStep,
  submission: MasterySubmission,
  recordedAt: string,
): LearningProject {
  const checkId = step.masteryCheckIds[0];
  if (checkId === undefined) throw new Error("This compact fixture does not yet attach a mastery check to the capability.");
  const check = graph.nodes.find((node) => node.id === checkId);
  if (check?.mastery === undefined) throw new Error(`Mastery check ${checkId} is missing its contract.`);
  if (check.mastery.diagnostic !== undefined) throw new Error("Deterministic diagnostics must be evaluated from submitted answers.");
  if (check.mastery.evaluation === "deterministic") throw new Error("Deterministic checks require a scored diagnostic contract.");
  if (check.mastery.evaluation === "optional-ai") throw new Error("Optional AI evaluation is not available in the offline learning loop.");
  const artifactRef = submission.artifactRef.trim();
  const evaluatorRef = submission.evaluatorRef?.trim();
  if (artifactRef.length === 0) throw new Error("Describe where the completed work can be found.");
  if (!submission.attested) throw new Error("Confirm that the evidence instructions were completed before recording mastery.");
  if ((check.mastery.evaluation === "peer" || check.mastery.evaluation === "expert") && !evaluatorRef) {
    throw new Error(`Record the ${check.mastery.evaluation} evaluator before claiming independent mastery.`);
  }
  const confidence = check.mastery.evaluation === "expert" ? 0.95 : check.mastery.evaluation === "peer" ? 0.9 : 0.8;
  const evidence: EvidenceRecord = {
    id: `evidence.mastery.${safeId(step.capabilityId)}.${safeId(recordedAt)}`,
    capabilityId: step.capabilityId,
    evidenceType: check.mastery.evidenceType,
    evaluator: check.mastery.evaluation,
    result: "independent",
    confidence,
    conditions: `Recorded against ${check.title}; learner attested that the stated ${check.mastery.evaluation} evaluation and evidence instructions were completed.`,
    artifactRef,
    ...(evaluatorRef ? { evaluatorRef } : {}),
    recordedAt,
    graphVersion: graph.version,
    masteryCheckId: checkId,
  };
  const learnerState = recordEvidence(project.learnerState, evidence, {
    currentDate: recordedAt,
    graphVersion: graph.version,
  });
  const goal = project.goals.at(-1);
  if (goal === undefined) throw new Error("A goal is required before recording mastery.");
  const plan = planLearningPath({ graph, learnerState, goal, currentDate: recordedAt, plannerVersion: PLANNER_VERSION });
  return {
    ...project,
    learnerState,
    planHistory: [...project.planHistory, plan],
  };
}

export function recordDiagnosticAndReplan(
  project: LearningProject,
  graph: KnowledgeGraph,
  step: PathStep,
  checkId: string,
  answers: DiagnosticAnswers,
  recordedAt: string,
): { project: LearningProject; evaluation: DiagnosticEvaluation } {
  const check = graph.nodes.find((node) => node.id === checkId);
  if (check === undefined) throw new Error(`Diagnostic ${checkId} does not exist in this graph.`);
  const { evidence, evaluation } = createDiagnosticEvidence({
    check,
    capabilityId: step.capabilityId,
    answers,
    evidenceId: `evidence.diagnostic.${safeId(step.capabilityId)}.${safeId(recordedAt)}`,
    recordedAt,
    graphVersion: graph.version,
  });
  const learnerState = recordEvidence(project.learnerState, evidence, {
    currentDate: recordedAt,
    graphVersion: graph.version,
  });
  const goal = project.goals.at(-1);
  if (goal === undefined) throw new Error("A goal is required before recording diagnostic evidence.");
  const plan = planLearningPath({ graph, learnerState, goal, currentDate: recordedAt, plannerVersion: PLANNER_VERSION });
  return {
    evaluation,
    project: { ...project, learnerState, planHistory: [...project.planHistory, plan] },
  };
}
