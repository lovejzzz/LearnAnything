export type SchemaVersion = "0.1.0";
export type LearningPathSchemaVersion = "0.2.0";
export type Depth = "orientation" | "foundation" | "working" | "advanced";
export type NodeKind =
  | "concept"
  | "capability"
  | "resource"
  | "experience"
  | "mastery-check"
  | "milestone";
export type Relation =
  | "requires"
  | "supports"
  | "teaches"
  | "assesses"
  | "contains"
  | "applies-in"
  | "contrasts-with"
  | "alternative-to";

export interface ResourceDetails {
  url: string;
  format: "article" | "book" | "documentation" | "video" | "simulation" | "course" | "tool" | "other";
  access: "free" | "freemium" | "paid" | "unknown";
  durationMinutes?: number;
}

export interface DiagnosticOption {
  id: string;
  label: string;
}

export interface DiagnosticQuestion {
  id: string;
  prompt: string;
  options: DiagnosticOption[];
  correctOptionId: string;
}

export interface DiagnosticDetails {
  questions: DiagnosticQuestion[];
  passingScore: number;
}

export interface MasteryDetails {
  evidenceType: "explanation" | "solution" | "analysis" | "build" | "performance" | "project" | "reflection";
  instructions: string;
  evaluation: "self" | "deterministic" | "peer" | "expert" | "optional-ai";
  diagnostic?: DiagnosticDetails;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  title: string;
  summary: string;
  depth: Depth;
  estimatedHours: number;
  sourceRefs: string[];
  tags?: string[];
  resource?: ResourceDetails;
  mastery?: MasteryDetails;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: Relation;
  rationale: string;
  sourceRefs?: string[];
}

export interface SourceLicense {
  status: "verified" | "unknown" | "restricted" | "repository-owned";
  identifier: string;
  attributionRequired: boolean;
  redistributionAllowed: boolean;
  derivativesAllowed: boolean;
  notes: string;
}

export interface GraphSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  sourceType: "primary" | "official" | "scholarly" | "open-education" | "reference" | "community" | "repository-authored";
  retrievedAt: string;
  authorityTier: "primary" | "high" | "contextual" | "candidate";
  contentUse: "link-only" | "metadata" | "excerpt" | "redistributable" | "repository-authored";
  license: SourceLicense;
}

export interface KnowledgeGraph {
  schemaVersion: SchemaVersion;
  id: string;
  version: string;
  title: string;
  description: string;
  language: string;
  license?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  sources: GraphSource[];
}

export type CapabilityStatus = "unseen" | "exploring" | "supported" | "independent" | "transfer" | "stale";
export type EvidenceResult = "insufficient" | "supported" | "independent" | "transfer";
export type Evaluator = "self" | "deterministic" | "peer" | "expert" | "optional-ai";
export type EvidenceType = MasteryDetails["evidenceType"] | "diagnostic";

export interface CapabilityState {
  capabilityId: string;
  status: CapabilityStatus;
  updatedAt: string;
}

export interface EvidenceRecord {
  id: string;
  capabilityId: string;
  evidenceType: EvidenceType;
  evaluator: Evaluator;
  result: EvidenceResult;
  confidence: number;
  conditions: string;
  artifactRef?: string;
  evaluatorRef?: string;
  recordedAt: string;
  graphVersion: string;
  masteryCheckId: string;
}

export interface LearnerState {
  schemaVersion: SchemaVersion;
  id: string;
  createdAt: string;
  updatedAt: string;
  preferences: {
    hoursPerWeek: number;
    language: string;
    reducedMotion: boolean;
  };
  capabilities: CapabilityState[];
  evidence: EvidenceRecord[];
}

export interface LearningGoal {
  description: string;
  targetCapabilityIds: string[];
  desiredDepth: Depth;
  purpose: string;
  hoursPerWeek: number;
}

export interface PathStep {
  capabilityId: string;
  stage: number;
  estimatedHours: number;
  reason: string;
  prerequisiteIds: string[];
  resourceIds: string[];
  experienceIds: string[];
  masteryCheckIds: string[];
}

export type HorizonActionKind = "learn" | "practice" | "demonstrate";

export interface HorizonAction {
  id: string;
  capabilityId: string;
  kind: HorizonActionKind;
  nodeId: string;
  estimatedHours: number;
  reason: string;
  partial: boolean;
}

export interface LearningPath {
  schemaVersion: LearningPathSchemaVersion;
  id: string;
  plannerVersion: string;
  graphId: string;
  graphVersion: string;
  learnerStateId: string;
  goal: LearningGoal;
  generatedAt: string;
  steps: PathStep[];
  horizon: {
    days: number;
    budgetHours: number;
    capabilityIds: string[];
    items: HorizonAction[];
  };
  blockedTargets: Array<{ capabilityId: string; reason: string }>;
}

export interface ActivityRecord {
  id: string;
  type: "resource-open";
  resourceId: string;
  recordedAt: string;
}

export interface LearningProject {
  schemaVersion: SchemaVersion;
  id: string;
  activeGraphId: string;
  learnerState: LearnerState;
  goals: LearningGoal[];
  planHistory: LearningPath[];
  activityHistory: ActivityRecord[];
}
