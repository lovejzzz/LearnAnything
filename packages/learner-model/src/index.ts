import type {
  CapabilityState,
  CapabilityStatus,
  EvidenceRecord,
  LearnerState,
} from "@learn-anything/contracts";

export const DEFAULT_EVIDENCE_MAX_AGE_DAYS = 180;
export const INDEPENDENT_CONFIDENCE_THRESHOLD = 0.75;

export interface StatusPolicy {
  currentDate: string;
  maxAgeDays?: number;
  graphVersion?: string;
}

function evidenceAgeDays(recordedAt: string, currentDate: string): number {
  return (Date.parse(currentDate) - Date.parse(recordedAt)) / 86_400_000;
}

function isStale(evidence: EvidenceRecord, policy: StatusPolicy): boolean {
  const maxAgeDays = policy.maxAgeDays ?? DEFAULT_EVIDENCE_MAX_AGE_DAYS;
  return evidenceAgeDays(evidence.recordedAt, policy.currentDate) > maxAgeDays ||
    (policy.graphVersion !== undefined && evidence.graphVersion !== policy.graphVersion);
}

export function deriveCapabilityStatus(
  learnerState: LearnerState,
  capabilityId: string,
  policy: StatusPolicy,
): CapabilityStatus {
  const evidence = learnerState.evidence
    .filter((record) => record.capabilityId === capabilityId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id));

  if (evidence.length === 0) {
    const recorded = learnerState.capabilities.find((item) => item.capabilityId === capabilityId)?.status;
    return recorded === "exploring" || recorded === "supported" || recorded === "stale" ? recorded : "unseen";
  }

  const current = evidence.filter((record) => !isStale(record, policy));
  if (current.length === 0) return "stale";
  if (current.some((record) => record.result === "transfer" && record.confidence >= INDEPENDENT_CONFIDENCE_THRESHOLD)) {
    return "transfer";
  }
  if (current.some((record) => record.result === "independent" && record.confidence >= INDEPENDENT_CONFIDENCE_THRESHOLD)) {
    return "independent";
  }
  if (current.some((record) => record.result === "supported" || record.result === "independent" || record.result === "transfer")) {
    return "supported";
  }
  return "exploring";
}

export function isCurrentlyDemonstrated(status: CapabilityStatus): boolean {
  return status === "independent" || status === "transfer";
}

export function createLearnerState(id: string, recordedAt: string, hoursPerWeek = 6): LearnerState {
  return {
    schemaVersion: "0.1.0",
    id,
    createdAt: recordedAt,
    updatedAt: recordedAt,
    preferences: { hoursPerWeek, language: "en", reducedMotion: false },
    capabilities: [],
    evidence: [],
  };
}

export function recordEvidence(
  learnerState: LearnerState,
  evidence: EvidenceRecord,
  policy: StatusPolicy,
): LearnerState {
  if (evidence.confidence < 0 || evidence.confidence > 1) throw new Error("Evidence confidence must be between 0 and 1");
  if (learnerState.evidence.some((record) => record.id === evidence.id)) throw new Error(`Evidence id already exists: ${evidence.id}`);

  const withEvidence: LearnerState = {
    ...learnerState,
    updatedAt: evidence.recordedAt,
    evidence: [...learnerState.evidence, evidence],
  };
  const status = deriveCapabilityStatus(withEvidence, evidence.capabilityId, policy);
  const nextCapability: CapabilityState = {
    capabilityId: evidence.capabilityId,
    status,
    updatedAt: evidence.recordedAt,
  };
  return {
    ...withEvidence,
    capabilities: [
      ...withEvidence.capabilities.filter((item) => item.capabilityId !== evidence.capabilityId),
      nextCapability,
    ].sort((a, b) => a.capabilityId.localeCompare(b.capabilityId)),
  };
}
