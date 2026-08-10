import type {
  ActivityRecord,
  LearnerState,
  LearningGoal,
  LearningPath,
  LearningProject,
} from "@learn-anything/contracts";

export interface BrowserStorage {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class InMemoryStorage implements BrowserStorage {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.values.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

export function appendActivity(project: LearningProject, activity: ActivityRecord): LearningProject {
  if (project.activityHistory.some((record) => record.id === activity.id)) throw new Error(`Activity id already exists: ${activity.id}`);
  return { ...project, activityHistory: [...project.activityHistory, activity] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isGoal(value: unknown): value is LearningGoal {
  return isRecord(value) &&
    typeof value.description === "string" && value.description.length > 0 &&
    isStringArray(value.targetCapabilityIds) && value.targetCapabilityIds.length > 0 &&
    ["orientation", "foundation", "working", "advanced"].includes(String(value.desiredDepth)) &&
    typeof value.purpose === "string" && value.purpose.length > 0 &&
    isPositiveNumber(value.hoursPerWeek);
}

function isLearnerState(value: unknown): value is LearnerState {
  if (!isRecord(value) || value.schemaVersion !== "0.1.0" || typeof value.id !== "string" ||
    !isIsoDate(value.createdAt) || !isIsoDate(value.updatedAt) || !isRecord(value.preferences) ||
    !Array.isArray(value.capabilities) || !Array.isArray(value.evidence)) return false;
  if (!isPositiveNumber(value.preferences.hoursPerWeek) || typeof value.preferences.language !== "string" ||
    typeof value.preferences.reducedMotion !== "boolean") return false;

  const statuses = new Set(["unseen", "exploring", "supported", "independent", "transfer", "stale"]);
  if (!value.capabilities.every((item) => isRecord(item) && typeof item.capabilityId === "string" &&
    statuses.has(String(item.status)) && isIsoDate(item.updatedAt))) return false;

  const evidenceTypes = new Set(["explanation", "solution", "analysis", "build", "performance", "project", "reflection", "diagnostic"]);
  const evaluators = new Set(["self", "deterministic", "peer", "expert", "optional-ai"]);
  const results = new Set(["insufficient", "supported", "independent", "transfer"]);
  return value.evidence.every((item) => isRecord(item) &&
    typeof item.id === "string" && typeof item.capabilityId === "string" &&
    evidenceTypes.has(String(item.evidenceType)) && evaluators.has(String(item.evaluator)) &&
    results.has(String(item.result)) && typeof item.confidence === "number" &&
    item.confidence >= 0 && item.confidence <= 1 && typeof item.conditions === "string" &&
    (item.artifactRef === undefined || typeof item.artifactRef === "string") && isIsoDate(item.recordedAt) &&
    typeof item.graphVersion === "string" && typeof item.masteryCheckId === "string");
}

function normalizeLearningPath(value: unknown): LearningPath | undefined {
  if (!isRecord(value) || (value.schemaVersion !== "0.1.0" && value.schemaVersion !== "0.2.0") || typeof value.id !== "string" ||
    typeof value.plannerVersion !== "string" || typeof value.graphId !== "string" ||
    typeof value.graphVersion !== "string" || typeof value.learnerStateId !== "string" ||
    !isGoal(value.goal) || !isIsoDate(value.generatedAt) || !Array.isArray(value.steps) ||
    !isRecord(value.horizon) || !Array.isArray(value.blockedTargets)) return undefined;
  if (!value.steps.every((step) => isRecord(step) && typeof step.capabilityId === "string" &&
    Number.isInteger(step.stage) && Number(step.stage) >= 1 && typeof step.estimatedHours === "number" &&
    step.estimatedHours >= 0 && typeof step.reason === "string" && isStringArray(step.prerequisiteIds) &&
    isStringArray(step.resourceIds) && (step.experienceIds === undefined || isStringArray(step.experienceIds)) &&
    isStringArray(step.masteryCheckIds))) return undefined;
  if (!Number.isInteger(value.horizon.days) || Number(value.horizon.days) < 1 ||
    !isPositiveNumber(value.horizon.budgetHours) || !isStringArray(value.horizon.capabilityIds)) return undefined;
  if (!value.blockedTargets.every((target) => isRecord(target) &&
    typeof target.capabilityId === "string" && typeof target.reason === "string")) return undefined;

  const items = value.horizon.items;
  if (items !== undefined && (!Array.isArray(items) || !items.every((item) => isRecord(item) &&
    typeof item.id === "string" && typeof item.capabilityId === "string" &&
    ["learn", "practice", "demonstrate"].includes(String(item.kind)) && typeof item.nodeId === "string" &&
    isPositiveNumber(item.estimatedHours) && typeof item.reason === "string" && typeof item.partial === "boolean"))) {
    return undefined;
  }
  if (value.schemaVersion === "0.2.0" && (!value.steps.every((step) => isRecord(step) && isStringArray(step.experienceIds)) || items === undefined)) {
    return undefined;
  }

  return {
    ...(value as unknown as Omit<LearningPath, "schemaVersion" | "steps" | "horizon">),
    schemaVersion: "0.2.0",
    steps: value.steps.map((step) => ({
      ...(step as unknown as LearningPath["steps"][number]),
      experienceIds: isRecord(step) && isStringArray(step.experienceIds) ? step.experienceIds : [],
    })),
    horizon: {
      days: Number(value.horizon.days),
      budgetHours: Number(value.horizon.budgetHours),
      capabilityIds: value.horizon.capabilityIds,
      items: Array.isArray(items) ? items as LearningPath["horizon"]["items"] : [],
    },
  };
}

function isActivity(value: unknown): value is ActivityRecord {
  return isRecord(value) && typeof value.id === "string" && value.type === "resource-open" &&
    typeof value.resourceId === "string" && isIsoDate(value.recordedAt);
}

export function parseProjectExport(serialized: string): LearningProject {
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new Error(`Project export is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  if (
    !isRecord(value) ||
    value.schemaVersion !== "0.1.0" ||
    typeof value.id !== "string" ||
    typeof value.activeGraphId !== "string" ||
    !isLearnerState(value.learnerState) ||
    !Array.isArray(value.goals) || !value.goals.every(isGoal) ||
    !Array.isArray(value.planHistory) ||
    !Array.isArray(value.activityHistory) || !value.activityHistory.every(isActivity)
  ) {
    throw new Error("Project export does not match schema version 0.1.0");
  }
  const planHistory = value.planHistory.map(normalizeLearningPath);
  if (planHistory.some((path) => path === undefined)) throw new Error("Project export contains an invalid learning path");
  return {
    ...(value as unknown as Omit<LearningProject, "planHistory">),
    planHistory: planHistory as LearningPath[],
  };
}

export class ProjectStore {
  constructor(
    private readonly storage: BrowserStorage,
    private readonly key = "learn-anything.project.0.1.0",
  ) {}

  async load(): Promise<LearningProject | undefined> {
    const value = await this.storage.get(this.key);
    return value === undefined ? undefined : parseProjectExport(value);
  }

  async save(project: LearningProject): Promise<void> {
    await this.storage.set(this.key, JSON.stringify(project));
  }

  export(project: LearningProject): string {
    return `${JSON.stringify(project, null, 2)}\n`;
  }

  async import(serialized: string): Promise<LearningProject> {
    const project = parseProjectExport(serialized);
    await this.save(project);
    return project;
  }

  async clear(): Promise<void> {
    await this.storage.delete(this.key);
  }
}
